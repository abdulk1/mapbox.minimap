const mapboxgl = (window as any).mapboxgl ? (window as any).mapboxgl : undefined;

export interface MiniMapOptions {
  id: string;
  width: number;
  height: number;
  style: string;
  center?: number[];
  bounds?: any;
  maxBounds?: any;
  zoomLevelFixed?: boolean;
  zoomLevelOffset?: number;
  lineColor?: string;
  lineWidth?: number;
  lineOpacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dragPan?: boolean;
  scrollZoom?: boolean;
  boxZoom?: boolean;
  dragRotate?: boolean;
  keyboard?: boolean;
  doubleClickZoom?: boolean;
  touchZoomRotate?: boolean;
  minimized?: boolean;
  toggleDisplay?: boolean;
  togglePosition?: 'bottomleft' | 'bottomright' | 'topleft' | 'topright';
  collapsedWidth?: number;
  collapsedHeight?: number;
  showText?: string;
  hideText?: string;
}

class Minimap extends mapboxgl.NavigationControl {
  private options: MiniMapOptions;

  private parentMap: mapboxgl.Map;
  private miniMap: mapboxgl.Map;
  private miniMapCanvas: HTMLElement;
  private container: HTMLDivElement;

  private isDragging: boolean;
  private isCursorOverFeature: boolean;
  private previousPoint: number[];
  private currentPoint: number[];
  private trackingRect: any;
  private trackingRectCoordinates: number[][][];

  private toggleDisplayButton: HTMLAnchorElement;
  private minimized: boolean;

  private onToggleButtonClick;
  private onLoad;

  private onMainMapMove;
  private onMainMapMoveEnd;

  private onMouseMove;
  private onMouseDown;
  private onMouseUp;

  constructor(private config?: MiniMapOptions) {
    super();
    this.parentMap = null;
    this.miniMap = null;
    this.isDragging = false;
    this.isCursorOverFeature = false;
    this.previousPoint = [0, 0];
    this.currentPoint = [0, 0];
    this.trackingRectCoordinates = [[[], [], [], [], []]];

    this.minimized = false;

    this.options = {
      id: 'mapbox-minimap',
      width: 320,
      height: 180,
      style: 'mapbox://styles/mapbox/streets-v8',
      center: [0, 0],

      zoomLevelFixed: false,
      zoomLevelOffset: -4,

      lineColor: '#08f',
      lineWidth: 1,
      lineOpacity: 1,

      fillColor: '#f80',
      fillOpacity: 0.25,

      dragPan: false,
      scrollZoom: false,
      boxZoom: false,
      dragRotate: false,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      minimized: false,
      toggleDisplay: true,
      collapsedWidth: 20,
      collapsedHeight: 20,
      togglePosition: 'bottomleft',
      showText: 'Show Minimap',
      hideText: 'Hide Minimap'
    };

    if (config) {
      Object.assign(this.options, config);
    }
  }

  private onAdd(parentMap: mapboxgl.Map): HTMLDivElement {
    this.parentMap = parentMap;

    const opts = this.options;
    const container = this.createContainer(parentMap);
    this.container = container;
    const miniMap = (this.miniMap = new mapboxgl.Map({
      attributionControl: false,
      container: container,
      style: opts.style,
      center: opts.center
    }));

    this.adjustZoom();

    if (opts.maxBounds) {
      miniMap.setMaxBounds(opts.maxBounds);
    }

    this.onLoad = this.load.bind(this);
    miniMap.on('load', this.onLoad);

    if (this.options.toggleDisplay) {
      this.addToggleButton();
    }

    return this.container;
  }

  private onRemove() {
    this.parentMap.off('move', this.onMainMapMove);
    this.parentMap.off('move', this.onMainMapMoveEnd);

    this.miniMap.off('load', this.onLoad);

    this.miniMap.off('mousemove', this.onMouseMove);
    this.miniMap.off('mousedown', this.onMouseDown);
    this.miniMap.off('mouseup', this.onMouseUp);

    this.miniMap.off('touchmove', this.onMouseMove);
    this.miniMap.off('touchstart', this.onMouseDown);
    this.miniMap.off('touchend', this.onMouseUp);

    this.miniMapCanvas.removeEventListener('wheel', this.preventDefault);
    this.miniMapCanvas.removeEventListener('mousewheel', this.preventDefault);

    this.toggleDisplayButton.removeEventListener('click', this.preventDefault);
    this.toggleDisplayButton.removeEventListener('mousedown', this.preventDefault);
    this.toggleDisplayButton.removeEventListener('dblclick', this.preventDefault);
    this.toggleDisplayButton.removeEventListener('click', this.onToggleButtonClick);

    this.container.removeEventListener('contextmenu', this.preventDefault);
    this.container.removeChild(this.toggleDisplayButton);
    this.container.parentNode.removeChild(this.container);
    this.miniMap = null;
  }

  private addToggleButton(): void {
    this.toggleDisplayButton = this.options.toggleDisplay
      ? this.createButton(
          '',
          this.toggleButtonInitialTitleText(),
          'minimap mapbox-ctrl-minimap-toggle-display mapbox-ctrl-minimap-toggle-display-' + this.options.togglePosition,
          this.container,
          this.toggle,
          this
        )
      : undefined;

    this.toggleDisplayButton.style.width = this.options.collapsedWidth + 'px';
    this.toggleDisplayButton.style.height = this.options.collapsedHeight + 'px';
  }

  private createButton(html: string, title: string, className: string, container: HTMLDivElement, fn, context): HTMLAnchorElement {
    const link = document.createElement('a');
    link.className = className;

    link.innerHTML = html;
    link.href = '#';
    link.title = title;

    link.addEventListener('click', this.preventDefault);
    link.addEventListener('mousedown', this.preventDefault);
    link.addEventListener('dblclick', this.preventDefault);

    this.onToggleButtonClick = this.toggle.bind(this);
    link.addEventListener('click', this.onToggleButtonClick);

    container.appendChild(link);

    return link;
  }

  private toggleButtonInitialTitleText(): string {
    if (this.options.minimized) {
      return this.options.showText;
    } else {
      return this.options.hideText;
    }
  }

  public toggle(): void {
    if (!this.minimized) {
      this.minimize();
    } else {
      this.restore();
    }
  }

  private minimize(): void {
    if (this.options.toggleDisplay) {
      this.container.style.width = this.options.collapsedWidth + 'px';
      this.container.style.height = this.options.collapsedHeight + 'px';
      this.toggleDisplayButton.className += ' minimized-' + this.options.togglePosition;
      this.toggleDisplayButton.title = this.options.showText;
    } else {
      this.container.style.display = 'none';
    }
    this.minimized = true;
  }

  private restore(): void {
    if (this.options.toggleDisplay) {
      this.container.style.width = this.options.width + 'px';
      this.container.style.height = this.options.height + 'px';
      this.toggleDisplayButton.className = this.toggleDisplayButton.className.replace('minimized-' + this.options.togglePosition, '');
      this.toggleDisplayButton.title = this.options.hideText;
    } else {
      this.container.style.display = 'block';
    }
    this.minimized = false;
  }

  public changeLayer(layer: string): void {
    this.miniMap.setStyle(layer);
    this.miniMap.on('style.load', () => {
      this.addRect(this.miniMap, this.options);
    });
  }

  public remove(): void {
    this.onRemove();
  }

  private load(): void {
    const opts = this.options;
    const parentMap = this.parentMap;
    const miniMap = this.miniMap;
    const interactions = ['dragPan', 'scrollZoom', 'boxZoom', 'dragRotate', 'keyboard', 'doubleClickZoom', 'touchZoomRotate'];

    interactions.forEach(function (i) {
      if (opts[i] !== true) {
        miniMap[i].disable();
      }
    });

    this.addRect(miniMap, opts);

    this.onMainMapMove = this.update.bind(this); // parent map move
    this.onMainMapMoveEnd = this.parentMapMoved.bind(this); // parent map move end

    this.onMouseMove = this.mouseMove.bind(this);
    this.onMouseDown = this.mouseDown.bind(this);
    this.onMouseUp = this.mouseUp.bind(this);

    parentMap.on('move', this.onMainMapMove);
    parentMap.on('moveend', this.onMainMapMoveEnd);

    miniMap.on('mousemove', this.onMouseMove);
    miniMap.on('mousedown', this.onMouseDown);
    miniMap.on('mouseup', this.onMouseUp);

    miniMap.on('touchmove', this.onMouseMove);
    miniMap.on('touchstart', this.onMouseDown);
    miniMap.on('touchend', this.onMouseUp);

    this.miniMapCanvas = miniMap.getCanvasContainer();
    this.miniMapCanvas.addEventListener('wheel', this.preventDefault);
    this.miniMapCanvas.addEventListener('mousewheel', this.preventDefault);
  }

  private addRect(miniMap: mapboxgl.Map, opts: MiniMapOptions): void {
    if (miniMap.getLayer('trackingRectOutline')) {
      miniMap.removeLayer('trackingRectOutline');
    }

    if (miniMap.getLayer('trackingRectFill')) {
      miniMap.removeLayer('trackingRectFill');
    }

    if (miniMap.getSource('trackingRect')) {
      miniMap.removeSource('trackingRect');
    }

    miniMap.addSource('trackingRect', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {
          name: 'trackingRect'
        },
        geometry: {
          type: 'Polygon',
          coordinates: this.trackingRectCoordinates
        }
      }
    });

    miniMap.addLayer({
      id: 'trackingRectOutline',
      type: 'line',
      source: 'trackingRect',
      layout: {},
      paint: {
        'line-color': opts.lineColor,
        'line-width': opts.lineWidth,
        'line-opacity': opts.lineOpacity
      }
    });

    // needed for dragging
    miniMap.addLayer({
      id: 'trackingRectFill',
      type: 'fill',
      source: 'trackingRect',
      layout: {},
      paint: {
        'fill-color': opts.fillColor,
        'fill-opacity': opts.fillOpacity
      }
    });

    this.trackingRect = this.miniMap.getSource('trackingRect');

    this.update();
  }

  private mouseDown(e): void {
    if (this.isCursorOverFeature) {
      this.isDragging = true;
      this.previousPoint = this.currentPoint;
      this.currentPoint = [e.lngLat.lng, e.lngLat.lat];
    }
  }

  private mouseMove(e): void {
    const miniMap = this.miniMap;
    const features = miniMap.queryRenderedFeatures(e.point, {
      layers: ['trackingRectFill']
    });

    // don't update if we're still hovering the area
    if (!(this.isCursorOverFeature && features.length > 0)) {
      this.isCursorOverFeature = features.length > 0;
      this.miniMapCanvas.style.cursor = this.isCursorOverFeature ? 'move' : '';
    }

    if (this.isDragging) {
      this.previousPoint = this.currentPoint;
      this.currentPoint = [e.lngLat.lng, e.lngLat.lat];

      const offset = [this.previousPoint[0] - this.currentPoint[0], this.previousPoint[1] - this.currentPoint[1]];

      var newBounds = this.moveTrackingRect(offset);

      this.parentMap.fitBounds(newBounds, {
        duration: 80
      });
    }
  }

  private mouseUp(): void {
    this.isDragging = false;
  }

  private moveTrackingRect(offset: number[]) {
    var source = this.trackingRect;
    var data = source._data;
    var bounds = data.properties.bounds;

    bounds._ne.lat -= offset[1];
    bounds._ne.lng -= offset[0];
    bounds._sw.lat -= offset[1];
    bounds._sw.lng -= offset[0];

    this.convertBoundsToPoints(bounds);
    source.setData(data);

    return bounds;
  }

  private setTrackingRectBounds() {
    const bounds = this.parentMap.getBounds();
    const source = this.trackingRect;
    const data = source._data;

    data.properties.bounds = bounds;
    this.convertBoundsToPoints(bounds);
    source.setData(data);
  }

  convertBoundsToPoints(bounds): void {
    const ne = bounds._ne;
    const sw = bounds._sw;
    const trc = this.trackingRectCoordinates;

    trc[0][0][0] = ne.lng;
    trc[0][0][1] = ne.lat;
    trc[0][1][0] = sw.lng;
    trc[0][1][1] = ne.lat;
    trc[0][2][0] = sw.lng;
    trc[0][2][1] = sw.lat;
    trc[0][3][0] = ne.lng;
    trc[0][3][1] = sw.lat;
    trc[0][4][0] = ne.lng;
    trc[0][4][1] = ne.lat;
  }

  private update(): void {
    if (this.isDragging) {
      return;
    }

    if (!this.options.zoomLevelFixed) {
      this.adjustZoom();
    }

    this.setTrackingRectBounds();
  }

  private parentMapMoved(): void {
    this.miniMap.setCenter(this.parentMap.getCenter());
    if (!this.options.zoomLevelFixed) {
      this.adjustZoom();
    }
  }

  private adjustZoom(): void {
    this.miniMap.setZoom(this.parentMap.getZoom() + this.options.zoomLevelOffset);
  }

  private createContainer(parentMap: mapboxgl.Map): HTMLDivElement {
    const opts = this.options;
    const container = document.createElement('div');

    container.className = 'mapbox-ctrl-minimap mapboxgl-ctrl';
    container.setAttribute('style', 'width: ' + opts.width + 'px; height: ' + opts.height + 'px;');
    container.addEventListener('contextmenu', this.preventDefault);

    parentMap.getContainer().appendChild(container);

    if (opts.id !== '') {
      container.id = opts.id;
    }

    return container;
  }

  private preventDefault(e): void {
    e.preventDefault();
  }
}

mapboxgl.Minimap = Minimap;
