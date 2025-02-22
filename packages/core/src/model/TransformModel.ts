import { observable, action } from 'mobx';
import { EventType } from '../constant/constant';
import EventEmitter from '../event/eventEmitter';
import { PointTuple, ZoomParam } from '../type';

export interface TransfromInterface {
  SCALE_X: number;
  SKEW_Y: number;
  SKEW_X: number;
  SCALE_Y: number;
  TRANSLATE_X: number;
  TRANSLATE_Y: number;
  ZOOM_SIZE: number;
  MINI_SCALE_SIZE: number; // 缩小的最小值
  MAX_SCALE_SIZE: number; // 放大的最大值
  zoom: (isZoomout: ZoomParam) => boolean;
  HtmlPointToCanvasPoint: (point: PointTuple) => PointTuple;
  CanvasPointToHtmlPoint: (point: PointTuple) => PointTuple;
  moveCanvasPointByHtml: (point: PointTuple, x: number, y: number) => PointTuple;
}

export default class TransfromModel implements TransfromInterface {
  MINI_SCALE_SIZE = 0.2;
  MAX_SCALE_SIZE = 16;
  @observable SCALE_X = 1;
  @observable SKEW_Y = 0;
  @observable SKEW_X = 0;
  @observable SCALE_Y = 1;
  @observable TRANSLATE_X = 0;
  @observable TRANSLATE_Y = 0;
  @observable ZOOM_SIZE = 0.04;
  eventCenter: EventEmitter;
  constructor(eventCenter) {
    this.eventCenter = eventCenter;
  }
  setZoomMiniSize(size: number): void {
    this.MINI_SCALE_SIZE = size;
  }

  setZoomMaxSize(size: number): void {
    this.MAX_SCALE_SIZE = size;
  }

  /**
   * 将最外层graph上的点基于缩放转换为canvasOverlay层上的点。
   * @param param0 HTML点
   */
  HtmlPointToCanvasPoint([x, y]: PointTuple): PointTuple {
    return [(x - this.TRANSLATE_X) / this.SCALE_X, (y - this.TRANSLATE_Y) / this.SCALE_Y];
  }

  /**
   * 将最外层canvasOverlay层上的点基于缩放转换为graph上的点。
   * @param param0 HTML点
   */
  CanvasPointToHtmlPoint([x, y]: PointTuple): PointTuple {
    return [x * this.SCALE_X + this.TRANSLATE_X, y * this.SCALE_Y + this.TRANSLATE_Y];
  }

  /**
   * 将一个在canvas上的点，向x轴方向移动directionX距离，向y轴方向移动dirctionY距离。
   * 因为canvas可能被缩小或者放大了，所以其在canvas层移动的距离需要计算上缩放的量。
   * @param point 点
   * @param directionX x轴距离
   * @param directionY y轴距离
   */
  moveCanvasPointByHtml([x, y]: PointTuple, directionX: number, directionY: number): PointTuple {
    return [x + directionX / this.SCALE_X, y + directionY / this.SCALE_Y];
  }

  /**
   * 根据缩放情况，获取缩放后的delta距离
   * @param deltaX x轴距离变化
   * @param deltaY y轴距离变化
   */
  fixDeltaXY(deltaX: number, deltaY: number): PointTuple {
    return [deltaX / this.SCALE_X, deltaY / this.SCALE_Y];
  }

  @action
  zoom(zoomSize: ZoomParam = false, point?: PointTuple): boolean {
    let newScaleX = this.SCALE_X;
    let newScaleY = this.SCALE_Y;
    if (zoomSize === true) {
      newScaleX += this.ZOOM_SIZE;
      newScaleY += this.ZOOM_SIZE;
    } else if (zoomSize === false) {
      newScaleX -= this.ZOOM_SIZE;
      newScaleY -= this.ZOOM_SIZE;
    } else if (typeof zoomSize === 'number') {
      newScaleX = zoomSize;
      newScaleY = zoomSize;
    }
    if (newScaleX < this.MINI_SCALE_SIZE || newScaleX > this.MAX_SCALE_SIZE) {
      return false;
    }
    if (point) {
      this.TRANSLATE_X -= (newScaleX - this.SCALE_X) * point[0];
      this.TRANSLATE_Y -= (newScaleY - this.SCALE_Y) * point[1];
    }
    this.SCALE_X = newScaleX;
    this.SCALE_Y = newScaleY;
    this.emitGraphTransform('zoom');
    return true;
  }
  private emitGraphTransform(type) {
    this.eventCenter.emit(EventType.GRAPH_TRANSFORM, {
      type,
      transform: {
        SCALE_X: this.SCALE_X,
        SKEW_Y: this.SKEW_Y,
        SKEW_X: this.SKEW_X,
        SCALE_Y: this.SCALE_Y,
        TRANSLATE_X: this.TRANSLATE_X,
        TRANSLATE_Y: this.TRANSLATE_Y,
      },
    });
  }
  @action
  resetZoom() : void {
    this.SCALE_X = 1;
    this.SCALE_Y = 1;
    this.emitGraphTransform('resetZoom');
  }

  @action
  translate(x: number, y: number) {
    this.TRANSLATE_X += x;
    this.TRANSLATE_Y += y;
    this.emitGraphTransform('translate');
  }

  /**
   * 将图形定位到画布中心
   * @param targetX 图形当前x坐标
   * @param targetY 图形当前y坐标
   * @param width 画布宽
   * @param height 画布高
   */
  @action
  focusOn(targetX: number, targetY: number, width: number, height: number) {
    const [x, y] = this.CanvasPointToHtmlPoint([targetX, targetY]);
    const [deltaX, deltaY] = [width / 2 - x, height / 2 - y];
    this.TRANSLATE_X += deltaX;
    this.TRANSLATE_Y += deltaY;
    this.emitGraphTransform('focusOn');
  }
}
