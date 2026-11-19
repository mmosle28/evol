"""
Evol joystick bridge.

Use this if the browser can't talk to the Arduino directly (for example, when the game runs inside
claude.ai, which blocks USB access). It reads the Arduino's "x,y,button" lines and presses the matching
keyboard keys (arrow keys + Space), so the game sees a keyboard.

Setup (once):   pip install pyserial pynput
Run:            python serial_to_keys.py            (finds the Arduino automatically)
                python serial_to_keys.py COM3       (or name the port: COM3 on Windows, /dev/ttyACM0 on Linux)
Then click on the game window so it has focus. Stop with Ctrl+C.
"""

import sys
import serial
import serial.tools.list_ports
from pynput.keyboard import Controller, Key

DEADZONE = 0.35  # how far the stick must move before a key is pressed
keyboard = Controller()
held = set()


def find_port():
    for p in serial.tools.list_ports.comports():
        text = f"{p.description} {p.manufacturer or ''}".lower()
        if any(word in text for word in ("arduino", "mega", "ch340", "usb serial", "acm")):
            return p.device
    ports = serial.tools.list_ports.comports()
    return ports[0].device if ports else None


def set_key(key, down):
    """Press or release a key only when its state changes."""
    if down and key not in held:
        keyboard.press(key)
        held.add(key)
    elif not down and key in held:
        keyboard.release(key)
        held.discard(key)


def main():
    port = sys.argv[1] if len(sys.argv) > 1 else find_port()
    if not port:
        print("No Arduino found. Plug it in, or pass the port name, e.g. python serial_to_keys.py COM3")
        return
    print(f"Listening on {port}. Click the game window. Ctrl+C to stop.")
    with serial.Serial(port, 115200, timeout=1) as ser:
        try:
            while True:
                line = ser.readline().decode(errors="ignore").strip()
                parts = line.split(",")
                if len(parts) != 3:
                    continue
                try:
                    x = (int(parts[0]) - 512) / 512
                    y = (int(parts[1]) - 512) / 512
                    btn = parts[2] == "1"
                except ValueError:
                    continue
                set_key(Key.left, x < -DEADZONE)
                set_key(Key.right, x > DEADZONE)
                set_key(Key.up, y < -DEADZONE)
                set_key(Key.down, y > DEADZONE)
                set_key(Key.space, btn)
        except KeyboardInterrupt:
            pass
        finally:
            for k in list(held):
                keyboard.release(k)


if __name__ == "__main__":
    main()
