/**
 * @fileoverview  Tool script for WP-ImaGeMap.
 * @author Akabeko ( http://akabeko.me )
 */

;( function( $ ) {
// Check jQuery ( Required )
if( !( $ ) ) { return; }

/**
 * Script parameters from article page.
 * @type {Object}
 */
var WpImaGeoMapParams = getWpImaGeoMapParams();

/**
 * Get elevation from location.
 *
 * @param {Number}   latitude  Latitude.
 * @param {Number}   longitude Longitude.
 * @param {Function} callback  A function to be called when the process finishes.
 */
function getElevation( latitude, longitude, callback ) {
    if( !( latitude && longitude && callback ) ) { return; }

    var url = 'http://maps.googleapis.com/maps/api/elevation/json?locations=' + latitude + ',' + longitude + '&sensor=false';
    $.get( url, null, function( data, status ) {
        if( data && data.results && data.results.length && data.results.length > 0 ) {
            callback( data.results[ 0 ].elevation, status );
        } else {
            callback( null, status );
        }
    } );
}

/**
 * Get normal marker image.
 *
 * @return {Object} Marker image.
 */
var markerImageNormal = ( function() {
    var image = new google.maps.MarkerImage( WpImaGeoMapParams.dir + "images/marker.png", new google.maps.Size( 28, 28 ), new google.maps.Point( 0,0 ), new google.maps.Point( 14, 28 ) );
    return function() { return image; };
} )();

/**
 * Get selected marker image.
 *
 * @return {Object} Marker image.
 */
var markerImageSelected = ( function() {
    var image = new google.maps.MarkerImage( WpImaGeoMapParams.dir + "images/marker-select.png", new google.maps.Size( 28, 28 ), new google.maps.Point( 0,0 ), new google.maps.Point( 14, 28 ) );
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
    marker.altitude      = ( params.altitude == undefined ? "" : params.altitude );
    marker.datetime      = ( params.datetime == undefined ? "" : params.datetime );
    marker.address       = ( params.address  == undefined ? "" : params.address  );
    marker.comment       = ( params.comment  == undefined ? "" : params.comment  );
    marker.thumbnail     = new Image();
    marker.thumbnail.src = params.url;

    return marker;
}

/**
 * Create an area to display the information of the marker that is selected.
 *
 * @param {Object} owner Owner jQuery object.
 */
function createMarkerInfoArea( owner ) {
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

    var infoArea = {
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
    return infoArea;
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
        var map = new google.maps.Map( params.div.find( "#imageomap_canvas_" + params.id )[ 0 ], { zoom: params.map[ "zoom" ], center: new google.maps.LatLng( params.map[ "latitude" ], params.map[ "longitude" ] ), mapTypeId: google.maps.MapTypeId.ROADMAP, scaleControl: true } );

        var infoArea = createMarkerInfoArea( params.div );

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
        var markers = new Array();
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
            if( !( lines && lines.length && lines.length > 1 ) ) { return; }

            var max = Math.min( markers.length, lines.length );
            if( max < 2 ) { return; }

            var path = new Array();
            for( var i = 0; i < max; ++i ) {
                path[ i ] = markers[ i ].position;
            }

            var line = new google.maps.Polyline( { path: path, strokeColor: "#0000ff", strokeOpacity: 0.5, strokeWeight: 5 } );
            line.setMap( map );
        } )( params.lines );
    }

    // Create a maps
    ( function() {
        var maps   = new Array();
        var nextId = 0;

        $( 'div.imageomap' ).each( function() {
            var func = window[ 'imageomap_get_' + nextId ];
            if( func ) {
                var info = func();
                $( this ).append( $( '<div>' ).attr( { 'id':'imageomap_canvas_' + nextId, 'class':'map' } ).css( { width:info.width, height:info.height } ) );
                maps[ nextId ] = createMap( { id: nextId, div: $( this ), map: info.map, markers: info.markers, lines: info.line } );
                ++nextId;
            }
        } );
    } )();
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * マップ編集用のフォームを表します。
 * このクラスはフォーム操作のハンドラとなります。
 * フォーム中の各要素を毎回検索すると非効率なので、インスタンス生成時に一度だけ検索を行い、
 * 以降の操作はキャッシュされた要素に対して行われます。
 */
var WpImaGeoMapEditorForm = function() {
    var title        = document.getElementById( "marker_title"     );
    var url          = document.getElementById( "marker_url"       );
    var latitude     = document.getElementById( "marker_latitude"  );
    var longitude    = document.getElementById( "marker_longitude" );
    var altitude     = document.getElementById( "marker_altitude"  );
    var datetime     = document.getElementById( "marker_datetime"  );
    var address      = document.getElementById( "marker_address"   );
    var comment      = document.getElementById( "marker_comment"   );
    var thumbnail    = document.getElementById( "thumbnail"        );
    var is_read_exif = document.getElementById( "is_read_exif"     );

    // 未選択時のサムネイル画像
    noThumbnail = new Image();
    noThumbnail.src = WpImaGeoMapParams.dir + "images/noimage.gif";

    /**
     * フォームに入力された設定をマーカーへ取得します。
     *
     * @param marker マーカー。
     */
    this.getValue = function( marker ) {
        marker.title    = title.value;
        marker.altitude = altitude.value;
        marker.datetime = datetime.value;
        marker.address  = address.value;
        marker.comment  = comment.value;
    };

    /**
     * EXIF の読み込みを行う事を示す値を取得します。
     *
     * @return 読み込む場合は true。それ以外は false。
     */
    this.isReadExif = function() {
        return is_read_exif.checked;
    };

    /**
     * マーカーが選択状態になった時に呼び出す事で、要素を適切な状態に設定します。
     *
     * @param marker マーカー。
     */
    this.select = function( marker ) {
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
    };

    /**
     * マーカーが未選択状態になった時に呼び出す事で、全ての要素を空文字に設定し、入力を読み取り専用にします。
     */
    this.unselect = function() {
        disableAll();

        title.value     = "";
        url.value       = "";
        latitude.value  = "";
        longitude.value = "";
        altitude.value  = "";
        datetime.value  = "";
        address.value   = "";
        comment.value   = "";
        thumbnail.src   = noThumbnail.src;
    };

    /**
     * 住所を更新します。
     *
     * @param marker マーカー
     */
    this.updateAddress = function( marker ) {
        address.value = marker.address;
    };

    /**
     * 標高を更新します。
     *
     * @param    marker    マーカー
     */
    this.updateAltitude = function( marker ) {
        altitude.value = marker.altitude;
    };

    /**
     * 緯度・経度を更新します。
     *
     * @param marker マーカー
     */
    this.updateLatLng = function( marker ) {
        latitude.value  = marker.position.lat();
        longitude.value = marker.position.lng();
    };

    /**
     * 全ての要素をを読み取り専用にします。
     */
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

    // 初期状態の設定
    disableAll();
    thumbnail.src   = noThumbnail.src;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * マップ編集機能を提供します。
 */
var WpImaGeoMapEditor = function() {
    var map               = null;            //! マップ オブジェクト。
    var geo               = null;            //! Geo コード取得用オブジェクト。
    var markers           = new Array();    //! マーカーのコレクション。
    var selectedMarker    = null;            //! 選択されているマーカー。
    var nextID            = 0;                //! 次に割り当てるマーカーの識別子。
    var exifReader        = null;            //! EXIF 読み込みを行う CGI。
    var form              = null;            //! 編集用フォーム。

    /**
     * 画像をマーカーとしてマップに追加します。
     */
    this.addMarker = function() {
        var url = window.prompt( "URL", "" );
        if( url == null || url == "" ) { return; }

        if( form.isReadExif() ) {
            var target = exifReader + "?url=" + url + "&callback=?";
            $.getJSON( target, function( exif )
                {
                    var marker = createMarkerFromExif( exif );
                    markers[ markers.length ] = marker;
                    selectMarker( marker );
                });
        } else {
            var marker = createMarker( url );
            markers[ markers.length ] = marker;
            selectMarker( marker );
        }
    };

    /**
     * 指定された文字列中の & や "、' などを文字実体参照へ変換します。
     *
     * @param str 変換する文字列。
     *
     * @return 変換後の文字列。
     */
    function convertCharRef( str ) {
        // 文字実体参照は & から始まるので、必ずこの文字から変換する
        str = str.replace(/&/g,"&amp;");
        str = str.replace(/"/g,"&quot;");
        str = str.replace(/'/g,"&#039;");
        str = str.replace(/</g,"&lt;");
        str = str.replace(/>/g,"&gt;");
        return str;
    }

    /**
     * マーカーを作成します。
     *
     * @param url 画像の URL。
     *
     * @return    作成したマーカー。
     */
    function createMarker( url ) {
        var latlng = map.getCenter();
        var maker  = createMarker( nextID++, map, { url:url, latitude:latlng.lat(), longitude:latlng.lng(), name:getName( url ) } );
        marker.setDraggable( true );

        setAddress( marker );
        setElevation( marker );
        setEvent( marker );

        return marker;
    }

    /**
     * EXIF 情報からマーカーを作成します。
     *
     * @param exif 画像の EXIF 情報。
     *
     * @return 作成したマーカー。
     */
    function createMarkerFromExif( exif ) {
        var latlng = exif.latitude == 0 || exif.longitude == 0 ? map.getCenter() : new google.maps.LatLng( exif.latitude, exif.longitude );
        var marker = createMarker( nextID++, map, { url:exif.url, latitude:latlng.lat(), longitude:latlng.lng(), name:getName( exif.url ), altitude:exif.altitude, datetime:exif.datetime } );
        marker.setDraggable( true );

        setAddress( marker );

        if( marker.altitude == null || marker.altitude === "" ) {
            setElevation( marker );
        }

        setEvent( marker );

        return marker;
    }

    /**
     * 指定されたマーカーのインデックスを取得します。
     *
     * @param marker マーカー。
     *
     * @return 成功時はインデックス。失敗時は -1。
     */
    function findMarkerIndex( marker ) {
        if( marker != null ) {
            for( var index = 0; index < markers.length; ++index ) {
                if( markers[ index ].id == marker.id ) {
                    return index;
                }
            }
        }

        return -1;
    }

    /**
     * URL から画像名を取得します。
     *
     * @return 画像名。
     */
    function getName( url ) {
        var n = url.lastIndexOf( "/" );
        if( n == -1 ) { return url; }

        return url.substr( n + 1, url.length - n );
    }

    /**
     * 現在のマーカーとマップの状態を反映したショートコード文字列を取得します。
     *
     * @return 成功時はショートコード文字列。失敗時は null。
     */
    function getShortCode() {
        // マーカーが無ければ何もしない
        if( markers.length <= 0 ) { return null; }

        var text = "[imageomap]var map=" + getShortCodeMapValue() + ";var m=[" + getShortCodeMarkerValue( markers[ 0 ] );
        for( var index = 1; index < markers.length; ++index ) {
            text += "," + getShortCodeMarkerValue( markers[ index ] );
        }

        text += "];[/imageomap]\n";

        return text;
    }

    /**
     * マップの内容を JSON 形式の文字列として取得します。
     *
     * @return JSON 形式の文字列。
     */
    function getShortCodeMapValue() {
        var center = map.getCenter();
        return "{zoom:" + map.zoom + ",latitude:" + center.lat() + ",longitude:" + center.lng() + "}";
    }

    /**
     * 指定されたマーカーの内容を JSON 形式の文字列として取得します。
     *
     * @param marker マーカー。
     *
     * @return JSON 形式の文字列。
     */
    function getShortCodeMarkerValue( marker ) {
        // 名前、画像の URL、緯度・経度は常に設定
        var text = "{name:\"" + convertCharRef( marker.title ) + "\",url:\"" + marker.url + "\",latitude:" + marker.position.lat() + ",longitude:" + marker.position.lng();

        // 標高
        if( marker.altitude != null && marker.altitude != 0 ) {
            text += ",altitude:\"" + convertCharRef( marker.altitude ) + "\"";
        }

        // 撮影日時
        if( marker.datetime != null && marker.datetime != "" ) {
            text += ",datetime:\"" + convertCharRef( marker.datetime ) + "\"";
        }

        // 住所
        if( marker.datetime != null && marker.datetime != "" ) {
            text += ",address:\"" + convertCharRef( marker.address ) + "\"";
        }

        // コメント
        if( marker.comment != null && marker.comment != "" ) {
            text += ",comment:\"" + convertCharRef( marker.comment ) + "\"";
        }

        text += "}";
        return text;
    }

    /**
     * インスタンスを初期化します。
     */
    this.initialize = function() {
        var mapdiv    = document.getElementById( "imageomap_editor_canvas" );
        var myOptions = { zoom: 16, center: new google.maps.LatLng( 35.6894876, 139.6917064 ), mapTypeId: google.maps.MapTypeId.ROADMAP, scaleControl: true };
        map           = new google.maps.Map( mapdiv, myOptions );
        geo           = new google.maps.Geocoder();
        form          = new WpImaGeoMapEditorForm();

        // ツール系 CGI
        exifReader      = WpImaGeoMapParams.dir + "exif-reader.php";
    };

    /**
     * 指定されたマーカーが選択状態である事を調べます。
     *
     * @return 選択状態の場合は true。それ以外は false。
     */
    function isSelected( marker ) {
        return ( selectedMarker != null && selectedMarker.id == marker.id );
    }

    /**
     * 選択しているマーカーをマップから削除します。
     */
    this.removeMarker = function() {
        if( selectedMarker == null ) { return; }

        for( var index = 0; index < markers.length; ++index ) {
            if( markers[ index ].id == selectedMarker.id ) {
                markers[ index ].setMap();
                markers[ index ] = null;
                markers.splice( index, 1 );
                unselectMarker();

                // マーカーが全て削除された場合は、割り当てる識別子もリセットする
                if( markers.length == 0 )
                {
                    nextID = 0;
                }

                break;
            }
        }
    };

    /**
     * マーカーを選択状態にします。
     */
    function selectMarker( marker ) {
        // 前に選択されていたマーカーの情報を保存
        if( selectedMarker != null ) {
            selectedMarker.onSelectionChange( false );
            form.getValue( selectedMarker );
        }

        selectedMarker = marker;
        marker.onSelectionChange( true );
        form.select( marker );
    }

    /**
     * 指定されたマーカーのコレクション中の住所を取得します。
     *
     * @param    id    住所を取得するマーカーの識別子。
     */
    function setAddress( marker ) {
        var latlng = new google.maps.LatLng(  marker.position.lat(), marker.position.lng() );
        geo.geocode( { 'latLng': latlng }, function( results, status ) {
            if( results && results[ 0 ] ) {
                marker.address = results[ 0 ].formatted_address;

                // 選択中のマーカーだった場合はフォームも更新する
                if( isSelected( marker ) ) {
                    form.updateAddress( marker );
                }
            }
        });
    }

    /**
     * 指定されたマーカーに標高を設定します。
     *
     * @param marker マーカー。
     */
    function setElevation( marker ) {
        getElevation( marker.position.lat(), marker.position.lng(), function( altitude, status ) {
            if( altitude ) {
                marker.altitude = altitude;

                // 選択中のマーカーだった場合はフォームも更新する
                if( isSelected( marker ) ) {
                    form.updateAltitude( marker );
                }
            }
        } );
    }

    /**
     * マーカーのイベントを登録します。
     *
     * @param marker マーカー。
     */
    function setEvent( marker ) {
        // 選択
        google.maps.event.addListener( marker, 'click', function() {
            if( !isSelected( marker ) ) {
                selectMarker( marker );
            }
        });

        // 移動開始
        google.maps.event.addListener( marker, 'dragstart', function() {
            if( !isSelected( marker ) ) {
                selectMarker( marker );
            }
        });

        // 移動終了
        google.maps.event.addListener( marker, 'dragend', function() {
            updateMarker( marker );
        });
    }

    /**
     * 現在選択しているマーカーが表示されるようにマップを移動します。
     */
    this.showMarker = function() {
        if( selectedMarker != null ) {
            map.setCenter( selectedMarker.position );
        }
    };

    /**
     * マーカーの選択状態を解除します。
     */
    function unselectMarker() {
        selectedMarker = null;
        form.unselect();
    }

    /**
     * マーカーの状態を更新します。
     *
     * @param    marker    マーカー。
     */
    function updateMarker( marker ) {
        setAddress( marker );
        setElevation( marker );
        form.updateLatLng( marker );
    }

    /**
     * 「ショートコードを生成」ボタンが押された時に発生します。
     */
    this.onClickSubmitButton = function() {
        // 最後に選択していたマーカーの内容を保存
        if( selectedMarker != null ) {
            form.getValue( selectedMarker );
        }

        // edInsertContent で投稿用のテキストエリア
        self.parent.onImaGeoMapShortCode( getShortCode() );
        self.parent.tb_remove();
    };
};

// Initialize
$( document ).ready( function() {
    if( WpImaGeoMapParams.mode == 'edit' ) {
        var wpImaGeoMap =  new WpImaGeoMapEditor();
        wpImaGeoMap.initialize();

    } else {
        createMaps();
    }

} );

// End of script scope
} )( jQuery );
