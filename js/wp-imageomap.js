/**
 * @file   wp-imageomap.js
 * @author Akabeko
 * @brief  WP-ImaGeMap の機能を補完する為のスクリプトです。
 */

;( function( $ ) {

/**
 * スクリプトのパラメータ。
 */
var WpImaGeoParams = getWpImaGeoMapParams();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * マーカーを表します。
 *
 * @param map  マーカーの追加先となるマップ。
 * @param info マーカー生成用のパラメータ。
 */
var WpImaGeoMarker = function( map, info ) {
    /**
     * マーカーの画像を取得します。
     *
     * @return 画像。
     */
    var getImageNormal = ( function() {
        var image = new google.maps.MarkerImage( WpImaGeoParams.dir + "images/marker.png", new google.maps.Size( 28, 28 ), new google.maps.Point( 0,0 ), new google.maps.Point( 14, 28 ) );
        return function(){ return image; };
    })();

    /**
     * マーカーが選択された時の画像を取得します。
     *
     * @return 画像。
     */
    var getImageSelect = ( function() {
        var image = new google.maps.MarkerImage( WpImaGeoParams.dir + "images/marker-select.png", new google.maps.Size( 28, 28 ), new google.maps.Point( 0,0 ), new google.maps.Point( 14, 28 ) );
        return function(){ return image; };
    })();

    /**
     * マーカーが選択された時の画像を取得します。
     *
     * @return 画像。
     */
    var getImageShadow = ( function() {
        var image = new google.maps.MarkerImage( WpImaGeoParams.dir + "images/marker-shadow.png", new google.maps.Size( 43, 28 ), new google.maps.Point( 0,0 ), new google.maps.Point( 14, 28 ) );
        return function(){ return image; };
    })();

    /**
     * 選択状態が変更された時に発生します。
     *
     * @param isSelect 選択状態になった場合は true。それ以外は false。
     */
    this.onSelectionChange = function( isSelect ) {
        this.setIcon( isSelect ? getImageSelect() : getImageNormal() );
    };

    // 追加プロパティ
    this.id        = info.id;
    this.url       = info.url;
    this.altitude  = ( info.altitude == undefined ? "" : info.altitude );
    this.datetime  = ( info.datetime == undefined ? "" : info.datetime );
    this.address   = ( info.address  == undefined ? "" : info.address  );
    this.comment   = ( info.comment  == undefined ? "" : info.comment  );

    // 画像の読み込み
    this.thumbnail = new Image();
    this.thumbnail.src = info.url;

    // マーカー設定
    this.title     = info.title;
    this.draggable = info.draggable;
    this.position  = info.position;
    this.icon      = getImageNormal();
    this.shadow    = getImageShadow();

    // マップに追加
    this.setMap( map );
};

// マーカーを継承
WpImaGeoMarker.prototype = new google.maps.Marker();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * マップを表します。
 *
 * @param params パラメータ。
 */
var WpImaGeoMap = function( params ) {
    /**
     * マップ。
     */
    var map = new google.maps.Map( params.div.find( "#imageomap_canvas_" + params.id )[ 0 ], { zoom: params.map[ "zoom" ], center: new google.maps.LatLng( params.map[ "latitude" ], params.map[ "longitude" ] ), mapTypeId: google.maps.MapTypeId.ROADMAP, scaleControl: true } );

    /**
     * マーカーのコレクション。
     */
    var markers = new Array();

    /**
     * 選択されているマーカー。
     */
    var selectedMarker = null;

    /**
     * マーカーの持つ情報を書き出す table。
     */
    var infoTable = new WpImaGeoMapInfo( params.div );

    /**
     * マップ上のマーカー間を結ぶ線を引きます。
     *
     * @param count マーカーの総数。
     */
    function addLine( count ) {
        // マーカーが単体の場合は何もしない
        if( count < 2 ) { return; }

        var path = new Array();
        for( var i = 0; i < count; ++i ) {
            path[ i ] = markers[ i ].position;
        }

        var line = new google.maps.Polyline( { path: path, strokeColor: "#0000ff", strokeOpacity: 0.5, strokeWeight: 5 } );
        line.setMap( map );
    }

    /**
     * マーカーを追加します。
     *
     * @param infos 追加するマーカー情報のコレクション。
     */
    function addMarker( infos ) {
        // 一つ目のマーカーを選択する
        markers[ 0 ] = createMarker( 0, infos[ 0 ] );
        markers[ 0 ].onSelectionChange( true );
        selectedMarker = markers[ 0 ];
        setEvent( markers[ 0 ] );
        infoTable.update( markers[ 0 ] );

        for( var i = 1; i < infos.length; ++i ) {
            markers[ i ] = createMarker( i, infos[ i ] );
            setEvent( markers[ i ] );
        }
    }

    /**
     * マーカーを生成します。
     *
     * @param id   識別子。
     * @param info マーカー情報。
     */
    function createMarker( id, info ) {
        var latlng = new google.maps.LatLng( info.latitude, info.longitude );
        return new WpImaGeoMarker( map, { id: id, url: info.url, position:latlng, title: info.name, draggable: false, altitude: info.altitude, datetime: info.datetime, address: info.address, comment: info.comment } );
    }

    /**
     * マーカーを選択状態にします。
     *
     * @param marker マーカー。
     */
    function selectMarker( marker ) {
        // 前に選択されていたマーカーを非選択にする
        selectedMarker.onSelectionChange( false );

        // 新マーカーを選択
        selectedMarker = marker;
        marker.onSelectionChange( true );
        infoTable.update( marker );
    }

    /**
     * マーカーのイベントを設定します。
     *
     * @param marker マーカー。
     */
    function setEvent( marker ) {
        // 選択
        google.maps.event.addListener( marker, 'click', function() {
            if( selectedMarker.id != marker.id ) {
                selectMarker( marker );
            }
        });
    }

    // マーカー生成
    addMarker( params.markers );

    // マーカー間のライン生成
    if( params.line == "line" ) {
        addLine( params.markers.length );
    }
};

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
    noThumbnail.src = WpImaGeoParams.dir + "images/noimage.gif";

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
 * 画像の情報を表示する領域を表します。
 * このクラスは表示領域を操作する為のハンドラとなります。
 * 領域中の各要素を毎回検索すると非効率なので、インスタンス生成時に一度だけ検索を行い、
 * 以降の操作はキャッシュされた要素に対して行われます。
 *
 * @param id マップ領域。
 */
var WpImaGeoMapInfo = function( div ) {
    /**
     * マーカーの情報を元にテーブルを更新します。
     *
     * @param    marker    マーカー。
     */
    this.update = function( marker ) {
        image.src = marker.thumbnail.src;
        link.href= marker.url;

        title.text( marker.title );

        comment.text( marker.comment );
        if( marker.datetime != "" ) {
            datetime.text( marker.datetime );
        }
    };

    /**
     * 詳細情報のツールチップに表示される HTML を生成します。
     *
     * @param marker マーカー。
     *
     * @return テキスト。
     */
    function createDetailHtml( marker ) {
        var res = getResourceText();

        var text = "<table><tbody><tr><th nowrap=\"nowrap\">" + res.title + "</th><td>" + marker.title + "</td></tr>";

        if( marker.datetime != "" ) {
            text += "<tr><th nowrap=\"nowrap\">" + res.datetime + "</th><td>" + marker.datetime + "</td></tr>";
        }

        if( marker.address != "" ) {
            text += "<tr><th nowrap=\"nowrap\">" + res.address + "</th><td>" + marker.address + "</td></tr>";
        }

        text += "<tr><th nowrap=\"nowrap\">" + res.latitude + "</th><td>" + marker.position.lat() + "</td></tr><tr><th nowrap=\"nowrap\">" + res.longitude + "</th><td>" + marker.position.lng() + "</td></tr>";

        if( marker.altitude != "" && marker.altitude != "0m" ) {
            text += "<tr><th nowrap=\"nowrap\">" + res.altitude + "</th><td>" + marker.altitude + "</td></tr>";
        }

        text += "</tbody></table>";
        return text;
    }

    /**
     * 詳細情報のタイトルに使用するテキストを取得します。
     *
     * @return テキスト情報。
     */
    var getResourceText = ( function() {
        var res = WpImaGeoParams.text;
        return function(){ return res; };
    })();

    /**
     * インスタンスを初期化します。
     *
     * @param id テーブルの識別子。
     */
    function initialize( div ) {
        link     = div.find( "a.url" )[ 0 ];
        image    = div.find( "img.thumbnail" )[ 0 ];
        title    = div.find( "div.title" );
        datetime = div.find( "div.datetime" );
        comment  = div.find( "div.comment" );
    }

    var link     = null;
    var image    = null;
    var title    = null;
    var datetime = null;
    var comment  = null;

    initialize( div );
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
    var elevationReader   = null;            //! 標高読み込みを行う CGI。
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
        var marker = new WpImaGeoMarker( map, { id: nextID++, url: url, position:map.getCenter(), title: getName( url ), draggable: true });

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
        var marker = new WpImaGeoMarker( map, { id:  nextID++, url: exif.url, position:latlng, title: getName( exif.url ), draggable: true, altitude: exif.altitude, datetime: exif.datetime } );

        setAddress( marker );

        if( marker.altitude == null || marker.altitude == "" ) {
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
        exifReader      = WpImaGeoParams.dir + "exif-reader.php";
        elevationReader = WpImaGeoParams.dir + "elevation-reader.php";
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
        var target = elevationReader + "?latitude=" + marker.position.lat() + "&longitude=" + marker.position.lng() +  "&callback=?";
        $.getJSON( target, function( data ) {
            marker.altitude = data.altitude;

            // 選択中のマーカーだった場合はフォームも更新する
            if( isSelected( marker ) ) {
                form.updateAltitude( marker );
            }
        });
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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * マップ表示機能を提供します。
 */
var WpImaGeoMapViewer = function() {
    /**
     * マップのコレクション。
     */
    var maps = new Array();

    /**
     * インスタンスを初期化します。
     */
    this.initialize = function() {
        var id   = 0;
        var html = WpImaGeoParams.html;
        $( "div.imageomap" ).each( function() {
            var f = window[ "imageomap_get_" + id ];
            if( f != undefined ) {
                var info = f();
                $( this ).append( "<div id=\"imageomap_canvas_" + id + "\" class=\"map\" style=\"width:" + info.width + ";height:" + info.height + "\"></div>" + html );
                maps[ id ] = new WpImaGeoMap( { id: id, div: $( this ), map: info.map, markers: info.markers, line: info.line } );

                ++id;
            }
        });
    };
};

//唯一の WpImaGeoMap インスタンスを生成
var wpImaGeoMap = ( WpImaGeoParams.mode == "edit" ? new WpImaGeoMapEditor() : new WpImaGeoMapViewer() );

$( document ).ready( function() {
    wpImaGeoMap.initialize();
} );

} )( jQuery );