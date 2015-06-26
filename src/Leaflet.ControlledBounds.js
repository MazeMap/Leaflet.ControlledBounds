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

	// 		console.log(candidates);


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

		getBounds: function() {
			if (!this._controlledBounds) {
				this._calculateControlledBounds();
			}
			var origin = this.getPixelOrigin();

			var min = this.unproject([origin.x + this._controlledBounds.min.x,
									origin.y + this._controlledBounds.min.y]);
			var max = this.unproject([origin.x + this._controlledBounds.max.x,
									origin.y + this._controlledBounds.max.y]);

			return new L.LatLngBounds(min, max);
		},


		getOffset: function() {
			return this._controlledOffset ? this._controlledOffset : L.point(0, 0);
		},

		getCenter: function () {
			if (!this._controlledBounds) {
				return mapProto.getCenter.call(this);
			}

			return this.containerPointToLatLng(this._controlledBounds.getCenter());
		},

		setView: function (center, zoom, options) {
			center = L.latLng(center);
	// 		this._calculateControlledBounds();

			if (this._controlledBounds) {
				var point = this.project(center, this._limitZoom(zoom));
				point = point.add(this.getOffset());
				center = this.unproject(point, this._limitZoom(zoom));
			}

			return mapProto.setView.call(this, center, zoom, options);
		},

		setZoomAround: function (latlng, zoom, options) {
			if (this._controlledBounds) {
				var scale = this.getZoomScale(zoom),
					viewHalf = this._controlledBounds.getCenter(),
					containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng),

					centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
					newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

				return this.setView(newCenter, zoom, {zoom: options});
			} else {
				return mapProto.setZoomAround.call(this, latlng, zoom, options);
			}
		},


		getBoundsZoom: function (bounds, inside, padding) { // (LatLngBounds[, Boolean, Point]) -> Number
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
				boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding);
				zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

			} while (zoomNotFound && zoom <= maxZoom);

			if (zoomNotFound && inside) {
				return null;
			}

			return inside ? zoom : zoom - 1;
		},

		getBounds: function() {
			if (this._controlledBounds) {
				return L.latLngBounds(
					this.containerPointToLatLng(this._controlledBounds.min),
					this.containerPointToLatLng(this._controlledBounds.max)
				);
			} else {
				return mapProto.getBounds.call(this);
			}
		},

		invalidateSize: function (options) {
			if (!this._loaded) { return this; }

			options = L.extend({
				animate: false,
				pan: true
			}, options === true ? {animate: true} : options);

			var oldCenter, oldSize;
			if (this._controlledBounds) {
				oldCenter = this._controlledBounds ? this._controlledBounds.getCenter() : this.getSize().divideBy(2).round();
				oldSize = L.point(this._controlledBounds.max.x -
								this._controlledBounds.min.x,
								this._controlledBounds.max.y -
								this._controlledBounds.min.y);
			} else {
				oldSize = this.getSize();
				oldCenter = oldSize.divideBy(2).round();
			}
			this._sizeChanged = true;
			this._initialCenter = null;
			this._calculateControlledBounds();

			var newCenter = this._lastControlledBounds.getCenter();
			var newSize = L.point(this._controlledBounds.max.x - this._controlledBounds.min.x,
								this._controlledBounds.max.y - this._controlledBounds.min.y);

			var offset = oldCenter.subtract(newCenter);

			if (!offset.x && !offset.y) { return this; }

			if (options.animate && options.pan) {
				this.panBy(offset);

			} else {
				if (options.pan) {
					this._rawPanBy(offset);
				}

				this.fire('move');

				if (options.debounceMoveend) {
					clearTimeout(this._sizeTimer);
					this._sizeTimer = setTimeout(L.bind(this.fire, this, 'moveend'), 200);
				} else {
					this.fire('moveend');
				}
			}

			return this.fire('resize', {
				oldSize: oldSize,
				newSize: newSize
			});
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
