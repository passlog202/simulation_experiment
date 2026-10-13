// 固件3: LED流水灯 + 状态上报
// 用于演示 GPIO 输出, 可通过串口命令控制

#define LED_COUNT 4
const int ledPins[LED_COUNT] = {8, 9, 10, 11};
int currentLed = 0;
bool running = true;

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < LED_COUNT; i++) {
    pinMode(ledPins[i], OUTPUT);
  }
  delay(100);
  Serial.println(F("[LED] Flow light controller v1.0"));
  Serial.println(F("[LED] Commands: 's'=stop 'r'=run '1-4'=toggle LED"));
}

void loop() {
  // 处理串口命令
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 's' || cmd == 'S') {
      running = false;
      Serial.println(F("[LED] Stopped"));
    } else if (cmd == 'r' || cmd == 'R') {
      running = true;
      Serial.println(F("[LED] Running"));
    } else if (cmd >= '1' && cmd <= '4') {
      int idx = cmd - '1';
      digitalWrite(ledPins[idx], !digitalRead(ledPins[idx]));
      Serial.print(F("[LED] Toggled LED"));
      Serial.println(idx + 1);
    }
  }

  if (running) {
    // 流水灯
    for (int i = 0; i < LED_COUNT; i++) {
      digitalWrite(ledPins[i], (i == currentLed) ? HIGH : LOW);
    }
    Serial.print(F("[LED] Active: LED"));
    Serial.println(currentLed + 1);
    currentLed = (currentLed + 1) % LED_COUNT;
  }
  delay(800);
}
