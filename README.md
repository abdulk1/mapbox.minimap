# mapbox.minimap

mapbox.minimap is a simple minimap control that you can drop into your mapbox map, and it will create a small map in the corner which shows the same as the main map with a set zoom offset.

[![npm version](https://badge.fury.io/js/mapbox.minimap.svg)](https://www.npmjs.com/package/mapbox.minimap)

## Using the MiniMap control

From the [example](https://abdulk1.github.io/mapbox.minimap/):

```js
minimap = new mapboxgl.Minimap({
  center: [-73.94656812952897, 40.72912351406106],
  zoom: 6,
  zoomLevels: [],
  togglePosition: 'topleft'
});
map.addControl(minimap, 'bottom-right');
```

## Available Options

```javascript
{
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
}
```

## Available Methods

`toggle`: Toggles the minimap open/close

`changeLayer`: Swaps out the minimap layer for the one provided

`remove`: Removes the minimap from the map and also removes all event listeners
