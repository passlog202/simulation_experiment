// ============================================================
// 智眸实验台 · 3D 模型交换器
// v1.0 2026-10-13
// 设计：每块开发板一个 3D 模型模块，统一接口，可热交换
// ============================================================

/**
 * 3D 模型统一接口
 * 每个开发板的 3D 模型必须实现这个接口
 */
export interface IBoard3DModel {
  /** 开发板 ID，与仿真核 boardId 对应 */
  readonly boardId: string;
  /** 模型名称 */
  readonly name: string;

  /** 构建 3D 模型，返回 THREE.Group */
  build(): any; // THREE.Group

  /** 更新模型状态（与仿真核同步） */
  update(state: BoardState): void;

  /** 获取可点击部件列表（用于交互） */
  getClickableParts(): ClickablePart[];

  /** 高亮某个部件（如故障注入时变红） */
  highlight(partId: string, color: number): void;
  clearHighlight(): void;
}

/** 开发板实时状态（来自仿真核） */
export interface BoardState {
  gpio: Map<string, 0 | 1>;      // 引脚电平
  adc: Map<number, number>;       // ADC 读数
  leds: Map<string, boolean>;     // LED 状态
  fault: string | null;           // 当前故障
}

/** 可点击部件 */
export interface ClickablePart {
  id: string;                     // 'atmega328p' | 'usb' | 'pin_d13' | ...
  name: string;                   // 中文名
  description: string;            // 教学说明
  object: any;                    // THREE.Object3D
}

/**
 * 3D 模型注册表 — 与仿真核注册表镜像
 * 后期加新板：registerModel() 一行搞定
 */
class Board3DRegistry {
  private models = new Map<string, () => IBoard3DModel>();

  registerModel(boardId: string, factory: () => IBoard3DModel): this {
    this.models.set(boardId, factory);
    return this;
  }

  createModel(boardId: string): IBoard3DModel {
    const factory = this.models.get(boardId);
    if (!factory) throw new Error(`[3D] 未注册的开发板模型: ${boardId}`);
    return factory();
  }

  hasModel(boardId: string): boolean {
    return this.models.has(boardId);
  }

  listModels(): string[] {
    return [...this.models.keys()];
  }
}

export const model3dRegistry = new Board3DRegistry();

/**
 * 3D 模型交换器
 * 负责在场景中切换不同开发板的 3D 模型
 */
export class Model3DSwitcher {
  private scene: any; // THREE.Scene
  private currentModel: IBoard3DModel | null = null;
  private currentGroup: any = null; // THREE.Group

  constructor(scene: any) {
    this.scene = scene;
  }

  /** 切换到指定开发板的 3D 模型 */
  switchTo(boardId: string): IBoard3DModel {
    // 移除旧模型
    if (this.currentGroup) {
      this.scene.remove(this.currentGroup);
      this.disposeGroup(this.currentGroup);
    }

    // 创建新模型
    const model = model3dRegistry.createModel(boardId);
    const group = model.build();
    this.scene.add(group);

    this.currentModel = model;
    this.currentGroup = group;

    console.log(`[3D] 已切换到 ${model.name}`);
    return model;
  }

  /** 同步仿真状态到 3D 模型 */
  syncState(state: BoardState): void {
    this.currentModel?.update(state);
  }

  /** 高亮部件 */
  highlight(partId: string, color: number = 0xff0000): void {
    this.currentModel?.highlight(partId, color);
  }

  clearHighlight(): void {
    this.currentModel?.clearHighlight();
  }

  getCurrentModel(): IBoard3DModel | null {
    return this.currentModel;
  }

  private disposeGroup(group: any): void {
    group.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
