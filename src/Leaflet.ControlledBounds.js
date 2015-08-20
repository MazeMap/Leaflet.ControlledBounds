(function(){

	var mapProto = L.extend({}, L.Map.prototype);
	var controlProto = L.extend({}, L.Control.prototype);

	L.Map.include({

		_controlledBounds: null,	// Will be an instance of L.Bounds.

		getControlledBounds: function() {
			if (!this._controlledBounds) {
				this._calculateControlledBounds();
			}
			return this._controlledBounds;
		},

		_calculateControlledBounds: function() {
			// Given the positions of the controls relative to the control container
			//   (which is the controls' offsetParent), calculate corners which are good
			//   candidates for being corners of the "controlled" area.
			// This assumes that all corner controls are placed vertically to one another.
			// Oh $deity, what a mess of spaghetti code and casuistics.
			var size = this.getSize();
			var candidates = {
				topleft:     [L.point(0, 0)],
				topright:    [L.point(size.x, 0)],
				bottomleft:  [L.point(0, size.y)],
				bottomright: [L.point(size.x, size.y)]
			};
			var previousBottom = 0;
			for (var i=0; i<this._controlCorners.topleft.children.length; i++) {
				var child = this._controlCorners.topleft.children[i];
				if (child.offsetTop + child.offsetLeft + child.offsetWidth + child.offsetHeight > 0) {
					var childTop    = child.offsetTop;
					var childLeft   = child.offsetLeft;
					var childBottom = childTop + child.offsetHeight;
					var childRight  = childLeft + child.offsetWidth;

					// Remove previous candidates which are completely obscured by the current control
					for (var j=0; j<candidates.topleft.length; j++) {
						if (candidates.topleft[j] && candidates.topleft[j].x < childRight) {
							candidates.topleft[j] = null;
						}
					}
					candidates.topleft.push(L.point(childRight, previousBottom));
					candidates.topleft.push(L.point(0, childBottom));

					previousBottom = childBottom;
				}
			}

			previousBottom = 0;
			for (var i=0; i<this._controlCorners.topright.children.length; i++) {
				var child = this._controlCorners.topright.children[i];
				if (child.offsetTop + child.offsetLeft + child.offsetWidth + child.offsetHeight > 0) {
					var childTop    = child.offsetTop;
					var childLeft   = child.offsetLeft + this._controlCorners.topright.offsetLeft;
					var childBottom = childTop + child.offsetHeight;
					var childRight  = childLeft + child.offsetWidth;

					// Remove previous candidates which are completely obscured by the current control
					for (var j=0; j<candidates.topright.length; j++) {
						if (candidates.topright[j] && candidates.topright[j].x > childLeft) {
							candidates.topright[j] = null;
						}
					}
					candidates.topright.push(L.point(childLeft, previousBottom));
					candidates.topright.push(L.point(size.x, childBottom));

					previousBottom = childBottom;
				}
			}

			var previousTop = size.y;
			for (var i=this._controlCorners.bottomleft.children.length - 1; i>=0; i--) {
				var child = this._controlCorners.bottomleft.children[i];
				if (child.offsetTop + child.offsetLeft + child.offsetWidth + child.offsetHeight > 0) {
					var childTop    = child.offsetTop + this._controlCorners.bottomleft.offsetTop;
					var childLeft   = child.offsetLeft;
					var childBottom = childTop + child.offsetHeight;
					var childRight  = childLeft + child.offsetWidth;

					// Remove previous candidates which are completely obscured by the current control
					for (var j=0; j<candidates.bottomleft.length; j++) {
						if (candidates.bottomleft[j] && candidates.bottomleft[j].x < childRight) {
							candidates.bottomleft[j] = null;
						}
					}
					candidates.bottomleft.push(L.point(childRight, previousTop));
					candidates.bottomleft.push(L.point(0, childTop));

					previousTop = childTop;
				}
			}

			previousTop = size.y;
			for (var i=this._controlCorners.bottomright.children.length - 1; i>=0; i--) {
				var child = this._controlCorners.bottomright.children[i];
				if (child.offsetTop + child.offsetLeft + child.offsetWidth + child.offsetHeight > 0) {
					var childTop    = child.offsetTop + this._controlCorners.bottomright.offsetTop;
					var childLeft   = child.offsetLeft + this._controlCorners.bottomright.offsetLeft;
					var childBottom = childTop + child.offsetHeight;
					var childRight  = childLeft + child.offsetWidth;

					// Remove previous candidates which are completely obscured by the current control
					for (var j=0; j<candidates.bottomright.length; j++) {
						if (candidates.bottomright[j] && candidates.bottomright[j].x > childLeft) {
							candidates.bottomright[j] = null;
						}
					}
					candidates.bottomright.push(L.point(childLeft, previousTop));
					candidates.bottomright.push(L.point(size.x, childTop));

					previousTop = childTop;
				}
			}

			candidates.topleft     = candidates.topleft.filter(function(i){return !!i;});
			candidates.topright    = candidates.topright.filter(function(i){return !!i;});
			candidates.bottomleft  = candidates.bottomleft.filter(function(i){return !!i;});
			candidates.bottomright = candidates.bottomright.filter(function(i){return !!i;});

// 			console.log(candidates);


			// Try out all combinations of the candidate corners, stick with the one that gives
			//   out the biggest area.
			var maxArea = -Infinity;
			var candidateBounds = null;

			for (i=0; i<candidates.topleft.length; i++) {
				var tl = candidates.topleft[i];
				for (j=0; j<candidates.topright.length; j++) {
					var tr = candidates.topright[j];
					for (k=0; k<candidates.bottomleft.length; k++) {
						var bl = candidates.bottomleft[k];
						for (l=0; l<candidates.bottomright.length; l++) {
							var br = candidates.bottomright[l];

							var top    = Math.max(tl.y, tr.y);
							var bottom = Math.min(bl.y, br.y);
							var left   = Math.max(tl.x, bl.x);
							var right  = Math.min(tr.x, br.x);

							var area = (bottom-top) * (right-left);
	// 						console.log(area, top, bottom, right, left);
							if (area > maxArea) {
								maxArea = area;
								candidateBounds = L.bounds([[left, top],[right, bottom]]);
							}
						}
					}
				}
			}

			// Pan the map around relative to the previous controlled bounds.
			var oldCenter, containerCenter;
			containerCenter = L.bounds([0,0], this.getSize()).getCenter();
			if (this._lastControlledBounds) {
				oldCenter = this._lastControlledBounds.getCenter();
			} else {
				oldCenter = containerCenter;
			}
			var newCenter = candidateBounds.getCenter();

			// Precalculate the absolute offset between the center of the map and
			//   the center of the controlled area, for use in setView
			this._controlledOffset = L.point( [containerCenter.x - newCenter.x ,
											containerCenter.y - newCenter.y ]);

			this._lastControlledBounds = candidateBounds;
			return this._controlledBounds = candidateBounds;
		},

		getOffset: function() {
			return this._controlledOffset ? this._controlledOffset : L.point(0, 0);
		},


		_offsetLatLng: function (latlng, zoom) {
			zoom = zoom === undefined ? this.getZoom() : zoom;
			return this.unproject(
				this.project(latlng, zoom).add(this.getOffset()),
				zoom
			);
		},

		_deoffsetLatLng: function (latlng, zoom) {
			zoom = zoom === undefined ? this.getZoom() : zoom;
			return this.unproject(
				this.project(latlng, zoom).subtract(this.getOffset()),
				zoom
			);
		},

		setView: function (center, zoom) {
			return mapProto.setView.call(this, this._offsetLatLng(center, zoom), zoom);
		},


		// setZoomAround needs to *undo* the changes introduced to `setView`
		setZoomAround: function (latlng, zoom, options) {
			var scale = this.getZoomScale(zoom),
				viewHalf = this.getSize().divideBy(2).subtract(this.getOffset()),
				containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng),

				centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
				newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

			return this.setView(newCenter, zoom, {zoom: options});
		},


		// setZoom needs to *undo* the changes introduced to `setView`
		setZoom: function (zoom, options) {
			if (!this._loaded) {
				this._zoom = zoom;
				return this;
			}
			return this.setView(this._deoffsetLatLng(this.getCenter()), zoom, {zoom: options});
		},


		// A shameless copy of Map.getBoundsZoom with a reference to _controlledBounds
		// which sets the size.
		getBoundsZoom: function (bounds, inside, padding) {
			bounds = L.latLngBounds(bounds);

			var zoom = this.getMinZoom() - (inside ? 1 : 0),
			    maxZoom = this.getMaxZoom(),
			    cb = this._controlledBounds,
			    size = (cb) ? L.point(cb.max.x - cb.min.x, cb.max.y - cb.min.y) : this.getSize(),

			    nw = bounds.getNorthWest(),
			    se = bounds.getSouthEast(),

			    zoomNotFound = true,
			    boundsSize;

			padding = L.point(padding || [0, 0]);

			do {
				zoom++;
				boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding).floor();
				zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

			} while (zoomNotFound && zoom <= maxZoom);

			if (zoomNotFound && inside) {
				return null;
			}

			return inside ? zoom : zoom - 1;
		},


		invalidateSize: function() {
			if (!this._loaded) { return this; }

			var oldOffset = this.getOffset();

			mapProto.invalidateSize.call(this);

			this._calculateControlledBounds();

			this.panBy(this.getOffset().subtract(oldOffset));
		}


	});

	L.Control.include({
		addTo: function(map) {
			controlProto.addTo.call(this, map);
			map.invalidateSize({animate: true});
			return this;
		},

		removeFrom: function(map) {
			if (this._map) {
				var __map = this._map;
				controlProto.removeFrom.call(this, map);
				__map.invalidateSize({animate: true});
				return this;
			} else {
				return controlProto.removeFrom.call(this, map);
			}
		}
	});



})();
