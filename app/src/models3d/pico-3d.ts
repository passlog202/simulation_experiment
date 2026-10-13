// ============================================================
// 智眸实验台 · 树莓派 Pico 3D 模型
// 程序化建模：小 PCB + RP2040 + USB-C + GPIO 排针
// v1.0 2026-10-13
// ============================================================

import type { IBoard3DModel, BoardState, ClickablePart } from './model-switcher.js';
import { model3dRegistry } from './model-switcher.js';

declare const THREE: any;

export class Pico3D implements IBoard3DModel {
  readonly boardId = 'pico';
  readonly name = '树莓派 Pico';

  private group: any = null;
  private ledMesh: any = null;
  private partMeshes = new Map<string, any>();
  private clickableParts: ClickablePart[] = [];

  build(): any {
    const g = new THREE.Group();
    this.group = g;

    // ---- PCB (51 × 21 mm，比例 1:10) ----
    const pcb = this.box(5.1, 0.12, 2.1, 0x006644, 0, 0, 0);
    pcb.name = 'pcb';
    g.add(pcb);
    this.registerPart('pcb', 'PCB 印刷电路板', 'Pico 的绿色电路板', pcb);

    // ---- RP2040 主芯片 ----
    const chip = this.box(0.7, 0.15, 0.7, 0x1a1a1a, 0, 0.12, 0);
    chip.name = 'rp2040';
    g.add(chip);
    this.registerPart('rp2040', 'RP2040 主控芯片', '双核 ARM Cortex-M0+，133MHz，比 Uno 快 8 倍', chip);

    // ---- USB-C 接口 ----
    const usb = this.box(0.9, 0.35, 0.7, 0x888888, -2.3, 0.15, 0);
    usb.name = 'usb_c';
    g.add(usb);
    this.registerPart('usb_c', 'USB-C 接口', '下载程序 + 串口 + 供电', usb);

    // ---- GPIO 排针 (两侧各 20 针) ----
    for (let i = 0; i < 20; i++) {
      const pinL = this.box(0.08, 0.3, 0.08, 0xffd700, -1.8 + i * 0.2, 0.2, -1.0);
      const pinR = this.box(0.08, 0.3, 0.08, 0xffd700, -1.8 + i * 0.2, 0.2, 1.0);
      pinL.name = `gpio_left_${i}`;
      pinR.name = `gpio_right_${i}`;
      g.add(pinL, pinR);
    }
    // 标注 GP25 (板载 LED)
    this.registerPart('gpio_25', 'GP25 引脚', '板载 LED 连接的引脚', g.children.find((c: any) => c.name === 'gpio_left_10') || g.children[0]);

    // ---- 板载 LED (GP25) ----
    const ledGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x333333, emissive: 0x00ff00, emissiveIntensity: 0,
    });
    this.ledMesh = new THREE.Mesh(ledGeo, ledMat);
    this.ledMesh.position.set(0.8, 0.15, 0.5);
    this.ledMesh.name = 'led_gp25';
    g.add(this.ledMesh);
    this.partMeshes.set('led_gp25', this.ledMesh);
    this.clickableParts.push({
      id: 'led_gp25', name: '板载 LED (GP25)',
      description: 'Pico 的板载 LED，接在 GP25 引脚', object: this.ledMesh,
    });

    // ---- BOOTSEL 按钮 ----
    const boot = this.box(0.3, 0.15, 0.3, 0xffffff, 1.5, 0.12, -0.5);
    boot.name = 'bootsel';
    g.add(boot);
    this.registerPart('bootsel', 'BOOTSEL 按钮', '按住接 USB 进入烧录模式', boot);

    // ---- Flash 芯片 ----
    const flash = this.box(0.5, 0.12, 0.5, 0x222222, 1.2, 0.1, 0.5);
    flash.name = 'flash';
    g.add(flash);
    this.registerPart('flash', 'Flash 存储芯片', '2MB，存程序和 MicroPython', flash);

    return g;
  }

  update(state: BoardState): void {
    const gp25 = state.gpio.get('GP25') ?? 0;
    if (this.ledMesh) {
      this.ledMesh.material.emissiveIntensity = gp25 === 1 ? 1.0 : 0;
    }
  }

  getClickableParts(): ClickablePart[] {
    return this.clickableParts;
  }

  highlight(partId: string, color: number): void {
    const mesh = this.partMeshes.get(partId);
    if (mesh?.material) {
      mesh.material.emissive = new THREE.Color(color);
      mesh.material.emissiveIntensity = 0.8;
    }
  }

  clearHighlight(): void {
    for (const mesh of this.partMeshes.values()) {
      if (mesh.material?.emissive) mesh.material.emissiveIntensity = 0;
    }
  }

  private box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): any {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  private registerPart(id: string, name: string, desc: string, mesh: any): void {
    this.partMeshes.set(id, mesh);
    this.clickableParts.push({ id, name, description: desc, object: mesh });
  }
}

// ---- 注册 ----
model3dRegistry.registerModel('pico', () => new Pico3D());
