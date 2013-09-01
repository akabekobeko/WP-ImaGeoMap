<?php
/*
Plugin Name: WP-ImaGeoMap
Plugin URI: http://akabeko.me/blog/software/wp-imageomap/
Description: Add Google Maps and photos to your posts and pages.
Version: 1.2.0
Author: Akabeko
Author URI: http://akabeko.me/
*/

/*  Copyright 2009 - 2013 Akabeko

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
*/

/**
 * Implement the WP-ImaGeoMap plug-in.
 */
class WpImaGeoMap
{
    /**
     * Setting name of the plug-in to be registered in the database of WordPress.
     */
    const OPTION_NAME = "wp_imageomap_options";

    /**
     * Localize text domain.
     */
    const TEXT_DOMAIN = "wp-imageomap";

    /**
     * 
     * Sequential number starting from 0 which is the identifier of the map.
     * Generate the WP-ImaGeoMap short code for each map.
     * For example, in order to assign a number from 0 to 2 when generating the three maps.
     */
    private $mapNumber = 0;

    /**
     * Plug-in options.
     */
    private $options;

    /**
     * Plug-indirectory URL。
     */
    private $pluginDirUrl;

    /**
     * Google Map API V3 URL。
     */
    private $googleMapScriptUrl;

    /**
     * Plug-in script URL.
     */
    private $mapScriptUrl;

    /**
     * Initialize an instance.
     */
    public function __construct()
    {
        $this->pluginDirUrl         = $this->getPluginDirURL();
        $this->options              = $this->getOption();
        $this->googleMapScriptUrl   = "http://maps.google.com/maps/api/js?sensor=false";
        $this->mapScriptUrl         = "{$this->pluginDirUrl}wp-imageomap.js";

        $lang = dirname( plugin_basename( __FILE__ ) ) . "/languages";
        load_plugin_textdomain( WpImaGeoMap::TEXT_DOMAIN, false, $lang );

        wp_register_script( "GoogleMap",   $this->googleMapScriptUrl   );
        wp_register_script( "WpImaGeoMap", $this->mapScriptUrl         );

        if( is_admin() )
        {
            add_action( "admin_head",                             array( &$this, "onWpHead"         )     );
            add_action( "admin_menu",                             array( &$this, "onAdminMenu"      )     );
            add_action( "admin_head_media_upload_imageomap_form", array( &$this, "onMediaHead"      )     );
            add_action( "media_buttons",                          array( &$this, "onMediaButtons"   ), 20 );
            add_action( "media_upload_imageomap",                 "media_upload_imageomap"                );
        }
        else
        {
            add_action( "wp_head",          array( &$this, "onWpHead"         ) );
            add_action( "wp_footer",        array( &$this, "onWpFoot"         ) );
            add_action( "wp_print_scripts", array( &$this, "onWpPrintScripts" ) );
        }

        add_filter( "admin_footer", array( &$this, "onAddShortCode" ) );

        add_shortcode( "imageomap", array( &$this, "onShortCode" ) );
    }

    /**
      * Get the URL of this plug-in.
      *
      * @return URL.
      */
    private function getPluginDirURL()
    {
        $dirs = explode( DIRECTORY_SEPARATOR, dirname( __FILE__ ) );
        $dir  = array_pop( $dirs ) . "/";
        return  WP_PLUGIN_URL . '/' . $dir;
    }

    /**
     * Get a plug-in settings.
     *
     * @return Settings.
     */
    private function getOption()
    {
        $options = get_option( WpImaGeoMap::OPTION_NAME );
        return ( is_array( $options ) ? $options : $this->getOptionDefalt() );
    }

    /**
     * Get a default plug-in settings.
     *
     * @return Default settings.
     */
    private function getOptionDefalt()
    {
        $options = array( "canvas_width" => "100%", "canvas_height" => "350px" );
        return $options;
    }

    /**
     * ショートコードを挿入する為のスクリプトをページに埋め込みます。
     */
    public function onAddShortCode()
    {
        // 投稿の編集画面だけを対象とする
        if( strpos( $_SERVER[ "REQUEST_URI" ], "post.php"     ) ||
            strpos( $_SERVER[ "REQUEST_URI" ], "post-new.php" ) ||
            strpos( $_SERVER[ "REQUEST_URI" ], "page-new.php" ) ||
            strpos( $_SERVER[ "REQUEST_URI" ], "page.php"     ) )
        {
            // ショートコードの編集を終えた時、wp-imageomap.js から以下の関数を呼び出す事で、
            // 生成されたショートコードの内容をテキストエリアに挿入できる。
            // edInsertContent は wp-imageomap.js から呼び出せないので、self.parent.onImaGeoMapShortCode( "ショートコード" ) のように呼び出す。
            //
            echo "<script type=\"text/javascript\">\n//<![CDATA\nfunction onImaGeoMapShortCode( value ) { edInsertContent( edCanvas, value ); }\n//]]>\n</script>\n";
        }
    }

    /**
     * It runs after the basic admin panel menu structure is in place.
     */
    public function onAdminMenu()
    {
        add_options_page( __( 'WP-ImaGeoMap Option', WpImaGeoMap::TEXT_DOMAIN ), 'WP-ImaGeoMap', 'level_8', basename( __FILE__ ), array( &$this, 'onOptionPage' ) ) ;
    }

    /**
     * メディアボタンを設定する時に発生します。
     */
    public function onMediaButtons()
    {
        global $post_ID, $temp_ID;

        $id     = (int)( 0 == $post_ID ? $temp_ID : $post_ID );
        $iframe = apply_filters( "media_upload_imageomap_iframe_src", "media-upload.php?post_id={$id}&amp;type=imageomap&amp;tab=imageomap" );
        $title  = "WP-ImaGeoMap";
        $link   = "<a href=\"{$iframe}&amp;TB_iframe=true&amp;keepThis=true&amp;height=500&amp;width=640\" class=\"thickbox\" title=\"{$title}\"><img src=\"{$this->pluginDirUrl}images/button.png\" alt=\"{$title}\" /></a>\n";

        echo $link;
    }

    /**
     * メディアボタンから起動されたダイアログの内容を出力する為に発生します。
     */
    public function onMediaButtonPage()
    {
?>
<form name="url_editor">
    <div id="imageomap_editor_canvas" style="width:100%; height:350px;"></div>
    <p class="submit" style="margin:4px 0px 4px 0px; padding:0px;">
        <input type="button" value="<?php _e( "Add Image", WpImaGeoMap::TEXT_DOMAIN ); ?>" id="imageomap_editor_add_image_button" />
        <input type="button" value="<?php _e( "Show Marker", WpImaGeoMap::TEXT_DOMAIN ); ?>" id="imageomap_editor_show_marker_button" />
        <input type="button" value="<?php _e( "Delete Marker", WpImaGeoMap::TEXT_DOMAIN ); ?>" id="imageomap_editor_delete_marker_button" />
    </p>
    <div class="imageomap">
        <div class="thumbnail"><img id="thumbnail" /></div>
        <div class="info">
            <table>
                <tbody>
                    <tr>
                        <td nowrap="nowrap"><?php _e( "Name : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td><input type="text" id="marker_title" style="width:120px;" /></td>
                        <td nowrap="nowrap"><?php _e( "Image : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td colspan="4"><input type="text" name="marker_url" id="marker_url" style="width:240px;" /></td>
                    </tr>
                    <tr>
                        <td nowrap="nowrap"><?php _e( "DateTime : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td><input type="text" id="marker_datetime" style="width:120px;" /></td>
                        <td nowrap="nowrap"><?php _e( "Address : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td colspan="4"><input type="text" id="marker_address" style="width:240px;" /></td>
                    </tr>
                    <tr>
                        <td nowrap="nowrap"><?php _e( "Latitude : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td><input type="text" id="marker_latitude" style="width:120px;" /></td>
                        <td nowrap="nowrap"><?php _e( "Longitude : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td><input type="text" id="marker_longitude" style="width:120px;" /></td>
                        <td nowrap="nowrap"><?php _e( "Altitude : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td><input type="text" id="marker_altitude" style="width:60px;" /></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="clear"></div>
        <textarea id="marker_comment" rows="3" style="width:600px;" ></textarea>
    </div>
    <input type="checkbox" id="is_read_exif" checked="checked" /><?php _e( "EXIF information is read from the image.", WpImaGeoMap::TEXT_DOMAIN ); ?>
    <p>
        <input type="button" class="button-primary" value="<?php _e( "Insert into Post", WpImaGeoMap::TEXT_DOMAIN ); ?>" id="imageomap_editor_submit_button" />
    </p>
</form>
<?php
    }

    /**
     * メディアボタンから表示したウィンドウのヘッダが読み込まれる時に呼び出されます。
     */
    public function onMediaHead()
    {
        $this->setScript( true );
    }

    /**
     * メディアボタンから表示したウィンドウのタブが設定される時に呼び出されます。
     *
     * @param    $tabs    規定のタブ情報コレクション。
     *
     * @return    実際に表示するタブ情報コレクション。
     */
    function onModifyMediaTab( $tabs )
    {
        return array( "imageomap" => __( "ShortCode Editor", WpImaGeoMap::TEXT_DOMAIN ) );
    }

    /**
     * プラグインの設定ページが表示される時に発生します。
     */
    public function onOptionPage()
    {
        if( $_POST[ "option" ] == "update" )
        {
            $this->options[ "canvas_width"  ] = $_POST[ "canvas_width"  ];
            $this->options[ "canvas_height" ] = $_POST[ "canvas_height" ];

            update_option( WpNicodo::OPTION_NAME, $this->options );
        }

        $checked      = 'checked="checked"';
        $is_read_exif = $this->options[ "is_read_exif " ] ? $checked : "";

?>
    <h2><?php _e( "WP-ImaGeoMap Option", WpImaGeoMap::TEXT_DOMAIN ); ?></h2>
    <div id="imageomap">
        <form action="<?php echo $_SERVER[ 'REQUEST_URI' ]; ?>" method="post">
            <fieldset>
                <legend><?php _e( "Google Map Size", WpImaGeoMap::TEXT_DOMAIN ); ?></legend>
                <p>
                <?php _e( "The size of Google Map put on the posts and pages is changed.", WpImaGeoMap::TEXT_DOMAIN ); ?>
                </p>
                <table>
                    <tbody>
                        <tr><td><?php _e( "Width : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td><input type="text" name="canvas_width" id="canvas_width" size="20" value="<?php echo $this->options[ 'canvas_width' ] ?>" /></td></tr>
                        <tr><td><?php _e( "Height : ", WpImaGeoMap::TEXT_DOMAIN ); ?></td><td><input type="text" name="canvas_height" id="canvas_height" size="20" value="<?php echo $this->options[ 'canvas_height' ] ?>" /></td></tr>
                    </tbody>
                </table>
            </fieldset>
            <p class="submit">
                <input type="submit" value="<?php _e( "Update Options", WpImaGeoMap::TEXT_DOMAIN ); ?>" />
                <input class="button-primary" type="hidden" name="option" value="update" />
            </p>
        </form>
    </div>
<?php
    }

    /**
     * ショートコードが実行される時に発生します。
     *
     * @param    $atts        ショートコードに指定されたパラメータのコレクション。
     * @param    $content    ショートコードのタグに囲まれたコンテンツ。
     *
     * @return    ショートコードの実行結果。
     */
    public function onShortCode( $atts, $content )
    {
        extract( shortcode_atts( array( "width" => "", "height" => "", "line" => "none" ), $atts ) );

        $content      = str_replace( "&#8217;", "'", $content );
        $canvasWidth  = ( $width  == "" ? $this->options[ "canvas_width"   ] : $width  );
        $canvasHeight = ( $height == "" ? $this->options[ "canvas_height"  ] : $height );
        $mapNumber    = $this->mapNumber++;

        // マップ表示領域となる div と、マップ用スクリプトを生成する。
        // 一つのページに複数のマップが表示される可能性がある為、連番を割り当てる事によってマップを個別に扱うようにしている。
        // $content に指定されるデータはマップとマーカーの配列の初期化スクリプトとなっているので、そのまま埋め込める。
        //
        $text = <<<HTML
<div class="imageomap">
<script type="text/javascript">
//<![CDATA[
function imageomap_get_{$mapNumber}(){ {$content} return { map: map, markers: m, line:"{$line}", width:"{$canvasWidth}", height:"{$canvasHeight}" }; }
//]]
</script>
</div>
HTML;
        return $text;
    }

    /**
     * フッター部分が設定される時に発生します。
     */
    public function onWpFoot()
    {
        $this->setScript();
    }

    /**
     * ヘッダー部分が設定される時に発生します。
     */
    public function onWpHead()
    {
        echo "<link rel=\"stylesheet\" type=\"text/css\" href=\"{$this->pluginDirUrl}style.css\" />\n";
    }

    /**
     * WordPress のスクリプト出力が行われる時に発生します。
     */
    public function onWpPrintScripts()
    {
        wp_enqueue_script( "jquery" );
        wp_enqueue_script( "GoogleMap" );

        add_filter( "script_loader_src", array( $this,"onWpSriptSrcCleanup" ) );
    }

    /**
     * スクリプトの URL を処理する為に発生します。
     *
     * @param    $src    スクリプトの URL。
     *
     * @return    処理後の URL。
     */
    public function onWpSriptSrcCleanup( $src )
    {
        if( strstr( $src, $this->googleMapScriptUrl ) )
        {
            return $this->trimScript( $src );
        }

        return $src;
    }

    /**
     * WP-ImaGeoMap 用の JavaScript を設定します。
     *
     * @param    $isEdit    編集モードなら true。それ以外は false。省略時の規定値は false。
     */
    private function setScript( $isEdit = false )
    {
        if( $isEdit )
        {
            echo <<<HTML
<script type="text/javascript">
//<![CDATA[
function getWpImaGeoMapParams(){return{mode:"edit",dir:"{$this->pluginDirUrl}"}; }
//]]
</script>
<script type="text/javascript" src="{$this->googleMapScriptUrl}"></script>
<script type="text/javascript" src="{$this->mapScriptUrl}"></script>
HTML;
        }
        else
        {
            $text = array(
                "Title"     => __( "Title : ",     WpImaGeoMap::TEXT_DOMAIN ),
                "DateTime"  => __( "DateTime : ",  WpImaGeoMap::TEXT_DOMAIN ),
                "Address"   => __( "Address : ",   WpImaGeoMap::TEXT_DOMAIN ),
                "Latitude"  => __( "Latitude : ",  WpImaGeoMap::TEXT_DOMAIN ),
                "Longitude" => __( "Longitude : ", WpImaGeoMap::TEXT_DOMAIN ),
                "Altitude"  => __( "Altitude : ",  WpImaGeoMap::TEXT_DOMAIN ) );

            $infoImageUrl = "{$this->pluginDirUrl}images/info.png";

            echo <<<HTML

<!-- WP-ImaGeoMap -->
<script type="text/javascript">
//<![CDATA[
function getWpImaGeoMapParams(){return{mode:"normal",dir:"{$this->pluginDirUrl}", text:{title:"{$text[ "Title" ]}",datetime:"{$text[ "DateTime" ]}",address:"{$text[ "Address" ]}",latitude:"{$text[ "Latitude" ]}",longitude:"{$text[ "Longitude" ]}",altitude:"{$text[ "Altitude" ]}"}}; }
//]]
</script>
<script type="text/javascript" src="{$this->mapScriptUrl}"></script>
HTML;
        }
    }

    /**
     * wp_enqueue_script によって登録されたスクリプトの URL の末尾に付く、余計な文字列を取り除きます。
     *
     * @param    $src    スクリプトの URL。
     *
     * @return    処理後の URL。
     */
    private function trimScript( $src )
    {
        return preg_replace( "/(\?|\&|\&(amp|#038);)ver=.*$/i", "", $src );
    }
}

// プラグインのインスタンス生成
if( class_exists( 'WpImaGeoMap' ) )
{
    $wpImaGeoMap = new WpImaGeoMap();

    // 以下の関数は管理画面限定
    if( is_admin() )
    {
        /**
         * メディアボタンからダイアログが起動された時に呼び出されます。
         */
        function media_upload_imageomap()
        {
            wp_iframe( "media_upload_imageomap_form" );
        }

        /**
         * メディアボタンから起動されたダイアログの内容を出力する為に呼び出されます。
         */
        function media_upload_imageomap_form()
        {
            global $wpImaGeoMap;

            add_filter( "media_upload_tabs", array( &$wpImaGeoMap, "onModifyMediaTab" ) );

            echo "<div id=\"media-upload-header\">\n";
            media_upload_header();
            echo "</div>\n";

            $wpImaGeoMap->onMediaButtonPage();
        }
    }
}

// アンインストール時のハンドラ登録
if( function_exists( 'register_uninstall_hook' ) )
{
    /**
     * プラグインのアンインストールが行われる時に発生します。
     */
    function onWpImaGeoMapUninstall()
    {
        if( class_exists( 'WpImaGeoMap' ) )
        {
            delete_option( WpImaGeoMap::OPTION_NAME );
        }
    }

    register_uninstall_hook( __FILE__, "onWpImaGeoMapUninstall" );
}
?>