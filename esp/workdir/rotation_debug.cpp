#include <ESP32Servo.h>

Servo myservo;


int servoPin = 13;
int buttonPin = 12;
int potPin = 32;

int ADC_Max = 4096;

int val;


void setup() {
  Serial.begin(115200);
	ESP32PWM::allocateTimer(0);
	ESP32PWM::allocateTimer(1);
	ESP32PWM::allocateTimer(2);
	ESP32PWM::allocateTimer(3);
  myservo.setPeriodHertz(50);
  myservo.attach(servoPin, 500, 2400);

  pinMode(buttonPin, INPUT_PULLDOWN);
}

bool locked = 0;
int last = LOW;

void loop() {
  int buttonState = digitalRead(buttonPin);
  if (buttonState != last) {
    last = buttonState;
    if (buttonState == HIGH) {
      locked = 1 - locked;
    }
  }

  if (!locked) {
    val = analogRead(potPin);
    val = map(val, 0, ADC_Max, 0, 180);
    myservo.write(val);
  }

  delay(50);
}