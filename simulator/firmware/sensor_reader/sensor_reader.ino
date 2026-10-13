// 固件2: 传感器读取 (ADC采样)
// 用于演示故障注入: 断开传感器时读数异常,固件自动报错
// A0 接虚拟温度传感器, 正常范围 20-30°C 对应 ADC 205-307

#define SENSOR_PIN A0
#define ADC_NORMAL_MIN 200
#define ADC_NORMAL_MAX 320

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println(F("[SENSOR] Temp sensor monitor v1.0"));
  Serial.println(F("[SENSOR] Pin: A0  Range: 200-320"));
}

void loop() {
  int raw = analogRead(SENSOR_PIN);
  float voltage = raw * 5.0 / 1023.0;
  float temp = (voltage - 0.5) * 100.0;  // TMP36 公式

  Serial.print(F("[SENSOR] ADC="));
  Serial.print(raw);
  Serial.print(F("  V="));
  Serial.print(voltage, 2);
  Serial.print(F("V  T="));
  Serial.print(temp, 1);
  Serial.println(F("C"));

  // 故障检测: 超出正常范围
  if (raw < ADC_NORMAL_MIN || raw > ADC_NORMAL_MAX) {
    Serial.println(F("[ERROR] Sensor out of range! Check wiring."));
    Serial.println(F("[ERROR] Possible causes: disconnected / short / power fault"));
  }

  delay(1500);
}
