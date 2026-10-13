// ============================================================
// 智眸实验台 · Arduino Uno 3D 模型
// 程序化建模：PCB + ATmega328P + USB + 电源 + 排针 + LED
// v1.0 2026-10-13
// ============================================================

import type { IBoard3DModel, BoardState, ClickablePart } from './model-switcher.js';
import { model3dRegistry } from './model-switcher.js';

// Three.js 通过全局或 import 加载，这里用动态类型
declare const THREE: any;

export class ArduinoUno3D implements IBoard3DModel {
  readonly boardId = 'uno';
  readonly name = 'Arduino Uno';

  private group: any = null;
  private ledMeshes = new Map<string, any>();
  private partMeshes = new Map<string, any>();
  private clickableParts: ClickablePart[] = [];

  build(): any {
    const g = new THREE.Group();
    this.group = g;

    // ---- PCB 板 (68.6 × 53.4 mm，比例缩放 1:10) ----
    const pcb = this.box(6.86, 0.16, 5.34, 0x006644, 0, 0, 0);
    pcb.name = 'pcb';
    g.add(pcb);
    this.registerPart('pcb', 'PCB 印刷电路板', '绿色电路板，所有元器件都焊接在上面', pcb);

    // ---- ATmega328P 主芯片 (黑色 DIP) ----
    const chip = this.box(1.4, 0.3, 0.6, 0x1a1a1a, -0.3, 0.23, 0);
    chip.name = 'atmega328p';
    g.add(chip);
    this.registerPart('atmega328p', 'ATmega328P 主控芯片', 'AVR 8位单片机，16MHz，你写的代码就跑在这里', chip);

    // 芯片引脚 (两侧)
    for (let i = 0; i < 14; i++) {
      const pinL = this.box(0.15, 0.05, 0.1, 0xcccccc, -0.3, 0.1, -0.7 + i * 0.1);
      const pinR = this.box(0.15, 0.05, 0.1, 0xcccccc, -0.3, 0.1, 0.7 - i * 0.1);
      g.add(pinL, pinR);
    }

    // ---- USB-B 接口 (银色) ----
    const usb = this.box(1.2, 0.8, 1.3, 0xaaaaaa, -2.5, 0.4, -1.8);
    usb.name = 'usb';
    g.add(usb);
    this.registerPart('usb', 'USB 接口', '连接电脑：下载程序 + 串口通信', usb);

    // ---- 电源插孔 (黑色圆柱) ----
    const powerJack = this.cylinder(0.45, 0.45, 0.6, 0x111111, -2.5, 0.3, 1.8);
    powerJack.name = 'power_jack';
    g.add(powerJack);
    this.registerPart('power_jack', 'DC 电源插孔', '外接 7-12V 电源', powerJack);

    // ---- 排针 (数字引脚 D0-D13) ----
    for (let i = 0; i < 14; i++) {
      const pin = this.box(0.12, 0.4, 0.12, 0xffd700, 2.5, 0.28, -2.2 + i * 0.35);
      pin.name = `pin_d${i}`;
      g.add(pin);
      if (i === 13) {
        this.registerPart('pin_d13', 'D13 引脚', '板载 LED 连接的引脚，blink 例程就是控制它', pin);
      }
    }

    // ---- 模拟引脚 A0-A5 ----
    for (let i = 0; i < 6; i++) {
      const pin = this.box(0.12, 0.4, 0.12, 0xffd700, 1.0, 0.28, -2.2 + i * 0.35);
      pin.name = `pin_a${i}`;
      g.add(pin);
      if (i === 0) {
        this.registerPart('pin_a0', 'A0 模拟引脚', 'ADC 输入，读取传感器模拟信号（0-1023）', pin);
      }
    }

    // ---- 板载 LED (L / TX / RX / ON) ----
    this.addLED(g, 'led_on', 'ON 电源指示灯', 0x00ff00, -1.0, 0.15, 2.2);
    this.addLED(g, 'led_l', 'L LED (D13)', 0xff0000, -0.3, 0.15, 2.2);
    this.addLED(g, 'led_tx', 'TX 发送指示', 0xffff00, 0.4, 0.15, 2.2);
    this.addLED(g, 'led_rx', 'RX 接收指示', 0xffff00, 1.1, 0.15, 2.2);

    // ---- 复位按钮 ----
    const reset = this.box(0.5, 0.25, 0.5, 0xcc0000, 0.5, 0.2, 1.5);
    reset.name = 'reset';
    g.add(reset);
    this.registerPart('reset', '复位按钮', '按下重启单片机，重新执行 setup()', reset);

    // ---- 晶振 (银色圆柱) ----
    const crystal = this.cylinder(0.2, 0.2, 0.35, 0xcccccc, -1.2, 0.25, 0.8);
    crystal.name = 'crystal';
    g.add(crystal);
    this.registerPart('crystal', '16MHz 晶振', '给芯片提供时钟信号，每秒 1600 万个节拍', crystal);

    return g;
  }

  update(state: BoardState): void {
    // D13 LED 跟随 GPIO 状态
    const d13 = state.gpio.get('D13') ?? 0;
    this.setLED('led_l', d13 === 1);

    // TX/RX LED 闪烁（有串口活动时）
    // ON LED 常亮
    this.setLED('led_on', true);
  }

  getClickableParts(): ClickablePart[] {
    return this.clickableParts;
  }

  highlight(partId: string, color: number): void {
    const mesh = this.partMeshes.get(partId);
    if (mesh && mesh.material) {
      mesh.material.emissive = new THREE.Color(color);
      mesh.material.emissiveIntensity = 0.8;
    }
  }

  clearHighlight(): void {
    for (const mesh of this.partMeshes.values()) {
      if (mesh.material?.emissive) {
        mesh.material.emissiveIntensity = 0;
      }
    }
  }

  // ---- 辅助方法 ----
  private box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): any {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  private cylinder(rTop: number, rBottom: number, h: number, color: number, x: number, y: number, z: number): any {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, h, 24);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  private addLED(g: any, id: string, name: string, color: number, x: number, y: number, z: number): void {
    const geo = new THREE.SphereGeometry(0.15, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x333333, emissive: color, emissiveIntensity: 0,
    });
    const led = new THREE.Mesh(geo, mat);
    led.position.set(x, y, z);
    led.name = id;
    g.add(led);
    this.ledMeshes.set(id, led);
    this.partMeshes.set(id, led);
    this.clickableParts.push({ id, name, description: '', object: led });
  }

  private setLED(id: string, on: boolean): void {
    const led = this.ledMeshes.get(id);
    if (led) led.material.emissiveIntensity = on ? 1.0 : 0;
  }

  private registerPart(id: string, name: string, desc: string, mesh: any): void {
    this.partMeshes.set(id, mesh);
    this.clickableParts.push({ id, name, description: desc, object: mesh });
  }
}

// ---- 注册 ----
model3dRegistry.registerModel('uno', () => new ArduinoUno3D());
