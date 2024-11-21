# Deprecated

This repository is no longer maintained and is deprecated. Please be aware that it may not work with the latest versions of its dependencies.

---

# Leaflet.ControlledBounds


This [Leaflet](http://leafletjs.com) plugin overloads some of the map's methods (setView, fitBounds, setZoom) so that the bounds are relative to the area of the map not covered by any map controls (hence "controlled" bounds). The center of the map becomes the center of that area.

## Demo

Try the [example page](http://mazemap.github.io/Leaflet.ControlledBounds/examples/index.html) !

## Usage

Include the javascript file after including the main Leaflet library:

	<script src="Leaflet.ControlledBounds.js"></script>

The useful bounds of the map will be cut down to the largest area not covered by any map controls (instances of L.Control added to the map).

Then, the map will center itself in the center of that DIV when calling setView, setZoom, fitBounds, getBounds, or zooming in/out.

## Limitations

The plugin will not detect changes in the size (or position) of the map controls. If the controls change under controlled circumstances (e.g. panels expanding), run `invalidateSize()`:

	map.invalidateSize();

The plugin has only been tested with Leaflet 0.7.x. It will most probably not work well with Leaflet 1.0's `flyTo` and `flyToBounds` methods.

## License

Licensed under the Apache 2.0 license. See the `LICENSE` file for details.

Contains code from [Leaflet-active-area](https://github.com/Mappy/Leaflet-active-area).
