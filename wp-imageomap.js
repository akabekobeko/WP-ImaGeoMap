/**
 * @fileoverview  Tool script for WP-ImaGeMap.
 * @author Akabeko ( http://akabeko.me )
 */

;( function( $ ) {
// Check jQuery ( Required )
if( !$ ) { return; }

/**
 * Script parameters from article page.
 * @type {Object}
 */
var WpImaGeoMapParams = getWpImaGeoMapParams();

/**
 * Get normal marker image.
 *
 * @return {Object} Marker image.
 */
var markerImageNormal = ( function() {
    var image = new google.maps.MarkerImage( WpImaGeoMapParams.dir + 'images/marker.png' );
    image.scaledSize = new google.maps.Size( 28, 28 );
    return function() { return image; };
} )();

/**
 * Get selected marker image.
 *
 * @return {Object} Marker image.
 */
var markerImageSelected = ( function() {
    var image = new google.maps.MarkerImage( WpImaGeoMapParams.dir + 'images/marker-select.png' );
    image.scaledSize = new google.maps.Size( 28, 28 );
    return function() { return image; };
} )();

/**
 * Create a marker.
 *
 * @param {Number} id     Identifier.
 * @param {Object} map    Map.
 * @param {Object} params Parameters defined by the WP-ImaGeoMap plugin ( Article pages JavaScript ).
 */
function createMarker( id, map, params ) {
    if( !params ) { return null; }

    var marker = new google.maps.Marker( {
           position: new google.maps.LatLng( params.latitude, params.longitude ),
           map:      map,
           icon:     markerImageNormal(),
           title:    params.name
    } );

    marker.id            = id;
    marker.url           = params.url;
    marker.altitude      = ( params.altitude ? params.altitude : '' );
    marker.datetime      = ( params.datetime ? params.datetime : '' );
    marker.address       = ( params.address  ? params.address  : '' );
    marker.comment       = ( params.comment  ? params.comment  : '' );
    marker.thumbnail     = new Image();
    marker.thumbnail.src = params.url;

    return marker;
}

/**
 * Create a maps for articles.
 */
function createMaps() {
    /**
     * Create a map for article.
     *
     * @param {Object} params Map parameters.
     */
    function createMap( params ) {
        var map = new google.maps.Map( params.div.find( '#imageomap_canvas_' + params.id )[ 0 ], { zoom: params.map.zoom, center: new google.maps.LatLng( params.map.latitude, params.map.longitude ), mapTypeId: google.maps.MapTypeId.ROADMAP, scaleControl: true } );

        // Information area
        var infoArea = null;
        ( function( owner ) {
            function createInfoArea() {
                return $( '<div>' )
                    .append( $( '<div>' ).addClass( 'thumbnail' )
                        .append( $( '<a>' ).attr( { 'target': '_blank' } )
                            .append( $( '<img>' ) )
                        )
                    )
                    .append( $( '<div>' ).addClass( 'info' )
                        .append( $( '<div>' ).addClass( 'title'    ) )
                        .append( $( '<div>' ).addClass( 'datetime' ) )
                        .append( $( '<div>' ).addClass( 'clear'    ) )
                        .append( $( '<div>' ).addClass( 'comment'  ) )
                    )
                    .append( $( '<div>' ).addClass( 'clear' ) );
            }

            infoArea = {
                div: createInfoArea(),
                update: function( marker ) {
                    this.div.find( '.thumbnail a'   ).attr( { 'href': marker.url } );
                    this.div.find( '.thumbnail img' ).attr( { 'src': marker.thumbnail.src } );
                    this.div.find( '.title'         ).text( marker.getTitle() );
                    this.div.find( '.datetime'      ).text( marker.datetime ? marker.datetime : '' );
                    this.div.find( '.comment'       ).text( marker.comment );
                }
            };

            owner.append( infoArea.div );
        } )( params.div );

        var selectedMarker = null;

        /**
         * To update the display by selecting the marker.
         *
         * @param {Object} marker Marker.
         */
        function selectMarker( marker ) {
            if( selectedMarker ) {
                selectedMarker.setIcon( markerImageNormal() );
            }

            selectedMarker = marker;
            selectedMarker.setIcon( markerImageSelected() );
            infoArea.update( selectedMarker );
        }

        // Create a markers
        var markers = [];
        ( function( infos ) {
            if( !( infos && infos.length && infos.length > 0 ) ) { return; }

            function setMarkerEvent( marker ) {
                google.maps.event.addListener( marker, 'click', function() {
                    if( selectedMarker != marker ) {
                        selectMarker( marker );
                    }
                } );
            }

            for( var markerId = 0, max = infos.length; markerId < max; ++markerId ) {
                markers[ markerId ] = createMarker( markerId, map, infos[ markerId ] );
                setMarkerEvent( markers[ markerId ] );
            }

            // Select first marker
            selectMarker( markers[ 0 ] );
        } )( params.markers );

        // Create a lines
        ( function( lines ) {
            if( lines !== 'line' ) { return; }

            var max = Math.min( markers.length, lines.length );
            if( max < 2 ) { return; }

            var path = [];
            for( var i = 0; i < max; ++i ) {
                path[ i ] = markers[ i ].position;
            }

            var line = new google.maps.Polyline( { path: path, strokeColor: '#0000ff', strokeOpacity: 0.5, strokeWeight: 5 } );
            line.setMap( map );
        } )( params.lines );
    }

    // Create a maps
    ( function() {
        var maps   = [];
        var nextId = 0;

        $( 'div.imageomap' ).each( function() {
            var func = window[ 'imageomap_get_' + nextId ];
            if( func ) {
                var info = func();
                $( this ).append( $( '<div>' ).attr( { 'id': 'imageomap_canvas_' + nextId, 'class': 'map' } ).css( { width: info.width, height: info.height } ) );
                maps[ nextId ] = createMap( { id: nextId, div: $( this ), map: info.map, markers: info.markers, lines: info.line } );
                ++nextId;
            }
        } );
    } )();
}

function createMapEditor() {
    /**
     * Google map.
     * @type Object
     */
    var map = new google.maps.Map( $( '#imageomap_editor_canvas' )[ 0 ], { zoom: 16, center: new google.maps.LatLng( 35.6894876, 139.6917064 ), mapTypeId: google.maps.MapTypeId.ROADMAP, scaleControl: true } );

    /**
     * Geo corder.
     * @type Object
     */
    var geo = new google.maps.Geocoder();

    /**
     * Form for editing the marker.
     * @type Object
     */
    var markerEditForm = null;

    /**
     * Map merkers.
     *
     * @type Array
     */
    var markers = [];

    /**
     * Next marker identifier ( 0 to N ).
     * @type Number
     */
    var markerNextId = 0;

    /**
     * Selected marrker.
     * @type Object
     */
    var selectedMarker = null;

    /**
     * Add new marker.
     */
    function addMarker() {
        var url = window.prompt( 'URL', '' );
        if( !url ) { return; }

        function getFileNameFromUrl( url ) {
            var n = url.lastIndexOf( '/' );
            if( n == -1 ) { return url; }

            return url.substr( n + 1, url.length - n );
        }

        function isSelected( marker ) {
            return ( selectedMarker !== null && selectedMarker.id == marker.id );
        }

        function setAddress( marker ) {
            geo.geocode( { latLng: marker.position }, function( results, status ) {
                if( results && results[ 0 ] ) {
                    marker.address = results[ 0 ].formatted_address;
                    if( isSelected( marker ) ) {
                        markerEditForm.updateAddress( marker );
                    }
                }
            } );
        }

        function setElevation( marker ) {
            var url = 'http://maps.googleapis.com/maps/api/elevation/json?locations=' + marker.position.lat() + ',' + marker.position.lng() + '&sensor=false';
            $.get( url, null, function( data, status ) {
                if( data && data.results && data.results.length && data.results.length > 0 ) {
                    marker.altitude = data.results[ 0 ].elevation;
                    if( isSelected( marker ) ) {
                        markerEditForm.updateAltitude( marker );
                    }
                }
            } );
        }

        function setEvent( marker ) {
            google.maps.event.addListener( marker, 'click', function() {
                if( !isSelected( marker ) ) {
                    selectMarker( marker );
                }
            });

            google.maps.event.addListener( marker, 'dragstart', function() {
                if( !isSelected( marker ) ) {
                    selectMarker( marker );
                }
            });

            google.maps.event.addListener( marker, 'dragend', function() {
                setAddress( marker );
                setElevation( marker );
                markerEditForm.selectMarker( marker );
            } );
        }

        function createNewMarker( url ) {
            var latlng = map.getCenter();
            var marker = createMarker( markerNextId++, map, { url: url, latitude: latlng.lat(), longitude: latlng.lng(), name: getFileNameFromUrl( url ) } );

            marker.setDraggable( true );
            setAddress( marker );
            setElevation( marker );
            setEvent( marker );

            return marker;
        }

        function createNewMarkerFromExif( exif ) {
            var latlng = exif.latitude === 0 || exif.longitude === 0 ? map.getCenter() : new google.maps.LatLng( exif.latitude, exif.longitude );
            var marker = createMarker( markerNextId++, map, { url:exif.url, latitude:latlng.lat(), longitude:latlng.lng(), name:getFileNameFromUrl( exif.url ), altitude:exif.altitude, datetime:exif.datetime } );

            marker.setDraggable( true );
            setAddress( marker );
            if( !( marker.altitude ) ) { setElevation( marker ); }
            setEvent( marker );

            return marker;
        }

        if( markerEditForm.isReadExif() ) {
            $.getJSON( WpImaGeoMapParams.dir + 'exif-reader.php?url=' + url + '&callback=?', function( exif ) {
                var marker = createNewMarkerFromExif( exif );
                markers[ markers.length ] = marker;
                selectMarker( marker );
            } );

        } else {
            var marker = createNewMarker( url );
            markers[ markers.length ] = marker;
            selectMarker( marker );
        }
    }

    /**
     * Remove a selected marker.
     */
    function removeMarker() {
        if( !selectedMarker ) { return; }

        for( var index = 0, max = markers.length; index < max; ++index ) {
            if( markers[ index ].id === selectedMarker.id ) {
                markers[ index ].setMap();
                markers[ index ] = null;
                markers.splice( index, 1 );

                // Reset marker next id.
                if( markers.length === 0 ) { markerNextId = 0; }
                
                selectedMarker = null;
                markerEditForm.selectMarker( null );

                break;
            }
        }
    }

    /**
     * Select a marker.
     *
     * @param {Object} marker Target marker.
     */
    function selectMarker( marker ) {
        // Save a form values
        if( selectedMarker ) {
            selectedMarker.setIcon( markerImageNormal() );
            markerEditForm.getValue( selectedMarker );
        }

        selectedMarker = marker;
        selectedMarker.setIcon( markerImageSelected() );
        markerEditForm.selectMarker( marker );
        map.setCenter( selectedMarker.position );
    }

    /**
     * Output a short code of the plug-in.
     */
    function outputShortCode() {
        // Save
        if( selectedMarker ) {
            markerEditForm.getValue( selectedMarker );
        }

        function createShortCode() {
            if( markers.length === 0 ) { return null; }

            function createMapValue() {
                var center = map.getCenter();
                return '{zoom:' + map.zoom + ',latitude:' + center.lat() + ',longitude:' + center.lng() + '}';
            }

            function createMarkerValue( marker ) {
                function replaceCharRef( str ) {
                    str = str.replace( /&/g, '&amp;'  );
                    str = str.replace( /"/g, '&quot;' );
                    str = str.replace( /'/g, '&#039;' );
                    str = str.replace( /</g, '&lt;'   );
                    str = str.replace( />/g, '&gt;'   );
                    return str;
                }

                var value = '{name:"' + replaceCharRef( marker.getTitle() ) + '",url:"' + marker.url + '",latitude:' + marker.position.lat() + ',longitude:' + marker.position.lng();
                if( marker.altitude ) { value += ',altitude:"' + replaceCharRef( marker.altitude ) + '"'; }
                if( marker.datetime ) { value += ',datetime:"' + replaceCharRef( marker.datetime ) + '"'; }
                if( marker.address  ) { value += ',address:"'  + replaceCharRef( marker.address  ) + '"'; }
                if( marker.comment  ) { value += ',comment:"'  + replaceCharRef( marker.comment  ) + '"'; }

                value += "}";
                return value;
            }

            var shortcode = '[imageomap]var map=' + createMapValue() + ';var m=[' + createMarkerValue( markers[ 0 ] );
            for( var index = 1, max =  markers.length; index < max; index++ ) {
                shortcode += ',' + createMarkerValue( markers[ index ] );
            }

            shortcode += '];[/imageomap]\n';
            return shortcode;
        }

        self.parent.onImaGeoMapShortCode( createShortCode() );
        self.parent.tb_remove();
    }

    // Create a edit form
    ( function() {
        var noImageUrl = WpImaGeoMapParams.dir + 'images/noimage.png';

        var title        = $( "#marker_title"     )[ 0 ];
        var url          = $( "#marker_url"       )[ 0 ];
        var latitude     = $( "#marker_latitude"  )[ 0 ];
        var longitude    = $( "#marker_longitude" )[ 0 ];
        var altitude     = $( "#marker_altitude"  )[ 0 ];
        var datetime     = $( "#marker_datetime"  )[ 0 ];
        var address      = $( "#marker_address"   )[ 0 ];
        var comment      = $( "#marker_comment"   )[ 0 ];
        var thumbnail    = $( "#thumbnail"        )[ 0 ];
        var is_read_exif = $( "#is_read_exif"     )[ 0 ];

        $( '#imageomap_editor_add_image_button'     ).click( function() { addMarker(); } );
        $( '#imageomap_editor_show_marker_button'   ).click( function() { if( selectedMarker ) { map.setCenter( selectedMarker.position ); } } );
        $( '#imageomap_editor_delete_marker_button' ).click( function() { removeMarker(); } );
        $( '#imageomap_editor_submit_button'        ).click( function() { outputShortCode(); } );

        function disableAll() {
            title.readOnly     = true;
            url.readOnly       = true;
            latitude.readOnly  = true;
            longitude.readOnly = true;
            altitude.readOnly  = true;
            datetime.readOnly  = true;
            address.readOnly   = true;
            comment.readOnly   = true;
        }

        markerEditForm = {
            getValue: function( marker ) {
                marker.title    = title.value;
                marker.altitude = altitude.value;
                marker.datetime = datetime.value;
                marker.address  = address.value;
                marker.comment  = comment.value;
            },
            selectMarker: function( marker ) {
                if( marker ) {
                    title.value     = marker.title;
                    url.value       = marker.url;
                    latitude.value  = marker.position.lat();
                    longitude.value = marker.position.lng();
                    altitude.value  = marker.altitude;
                    datetime.value  = marker.datetime;
                    address.value   = marker.address;
                    comment.value   = marker.comment;
                    thumbnail.src   = marker.thumbnail.src;

                    title.readOnly     = false;
                    altitude.readOnly  = false;
                    datetime.readOnly  = false;
                    address.readOnly   = false;
                    comment.readOnly   = false;
                } else {
                    disableAll();
                    title.value     = '';
                    url.value       = '';
                    latitude.value  = '';
                    longitude.value = '';
                    altitude.value  = '';
                    datetime.value  = '';
                    address.value   = '';
                    comment.value   = '';
                    thumbnail.src   = noImageUrl;
                }
            },
            updateAddress: function( marker ) {
                address.value = marker.address;
            },
            updateAltitude: function( marker ) {
                altitude.value = marker.altitude;
            },
            updateLatLng: function( marker ) {
                latitude.value  = marker.position.lat();
                longitude.value = marker.position.lng();
            },
            isReadExif: function() {
                return is_read_exif.checked;
            }
        };

        // Initialize
        thumbnail.src = noImageUrl;
        disableAll();
    } )();
}

// Initialize
$( document ).ready( function() {
    if( WpImaGeoMapParams.mode == 'edit' ) {
        createMapEditor();
    } else {
        createMaps();
    }
} );

// End of script scope
} )( jQuery );
