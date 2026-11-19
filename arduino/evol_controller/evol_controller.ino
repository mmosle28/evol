// Evol controller for the ELEGOO Mega 2560: one joystick module (with its push button) and an optional buzzer.
//
// Wiring (joystick module):
//   GND -> GND,  +5V -> 5V,  VRx -> A0,  VRy -> A1,  SW -> D2
// Optional active buzzer: + -> D8, - -> GND  (beeps when you eat, catch, or score)
// Optional LED: long leg -> D13 through a 220 ohm resistor, short leg -> GND (the board's built-in LED also works)
//
// Sends one line about 50 times a second over USB:  "x,y,button\n"  e.g. "512,498,0"
// x and y are 0-1023 (about 512 at rest), button is 1 while pressed.
// Listens for the letter 'b' from the game and gives a short beep and blink.

const int PIN_X = A0;
const int PIN_Y = A1;
const int PIN_BTN = 2;
const int PIN_BUZZ = 8;
const int PIN_LED = 13;

unsigned long buzzUntil = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BTN, INPUT_PULLUP);   // the joystick button pulls the pin LOW when pressed
  pinMode(PIN_BUZZ, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
}

void loop() {
  int x = analogRead(PIN_X);
  int y = analogRead(PIN_Y);
  int pressed = digitalRead(PIN_BTN) == LOW ? 1 : 0;

  Serial.print(x);
  Serial.print(',');
  Serial.print(y);
  Serial.print(',');
  Serial.println(pressed);

  // Feedback from the game
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'b') buzzUntil = millis() + 60;
  }
  bool on = millis() < buzzUntil;
  digitalWrite(PIN_BUZZ, on ? HIGH : LOW);
  digitalWrite(PIN_LED, on ? HIGH : LOW);

  delay(20);
}
