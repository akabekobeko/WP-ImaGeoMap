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
        $this->googleMapScriptUrl   = "http://maps.google.com/maps/api/js?sensor=false";
        $this->mapScriptUrl         = "{$this->pluginDirUrl}wp-imageomap.js";

        $lang = dirname( plugin_basename( __FILE__ ) ) . "/languages";
        load_plugin_textdomain( WpImaGeoMap::TEXT_DOMAIN, false, $lang );

        if( is_admin() )
        {
            add_action( "admin_head",                             array( &$this, "onWpHead"         )     );
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
     * Embed the page a script that can be used to insert a short code.
     */
    public function onAddShortCode()
    {
        if( strpos( $_SERVER[ "REQUEST_URI" ], "post.php"     ) ||
            strpos( $_SERVER[ "REQUEST_URI" ], "post-new.php" ) ||
            strpos( $_SERVER[ "REQUEST_URI" ], "page-new.php" ) ||
            strpos( $_SERVER[ "REQUEST_URI" ], "page.php"     ) )
        {
            // edInsertContent will not be called from wp-imageomap.js, Call self.parent.onImaGeoMapShortCode( "SHORTCODE" ).
            echo "<script type=\"text/javascript\">\n//<![CDATA\nfunction onImaGeoMapShortCode( value ) { edInsertContent( edCanvas, value ); }\n//]]>\n</script>\n";
        }
    }

    /**
     * It is executed when you set the media button.
     */
    public function onMediaButtons()
    {
        global $post_ID, $temp_ID;

        $id     = (int)( 0 == $post_ID ? $temp_ID : $post_ID );
        $iframe = apply_filters( "media_upload_imageomap_iframe_src", "media-upload.php?post_id={$id}&amp;type=imageomap&amp;tab=imageomap" );
        $title  = "WP-ImaGeoMap";
        $link   = "<a href=\"{$iframe}&amp;TB_iframe=true&amp;keepThis=true&amp;height=500&amp;width=640\" class=\"thickbox\" title=\"{$title}\"><img src=\"{$this->pluginDirUrl}images/button.png\" alt=\"{$title}\" style=\"width:16px;\" /></a>\n";

        echo $link;
    }

    /**
     * Output the contents of the dialog that is invoked from the media button.
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
     * It will be executed when the header of the window that was launched from the media button is loaded.
     */
    public function onMediaHead()
    {
        $this->setScript( true );
    }

    /**
     * It will be executed when the tab of the window that was launched from the media button is set.
     *
     * @param $tabs Original tabs.
     *
     * @return New tabs.
     */
    function onModifyMediaTab( $tabs )
    {
        return array( 'imageomap' => __( 'ShortCode Editor', WpImaGeoMap::TEXT_DOMAIN ) );
    }

    /**
     * It is invoked when a short code execution.
     *
     * @param $atts     Array of shortcode parametrs.
     * @param $content Content of shortcode.
     *
     * @return Shortcode results.
     */
    public function onShortCode( $atts, $content )
    {
        extract( shortcode_atts( array( 'width' => '100%', 'height' => '350px', 'line' => 'none' ), $atts ) );

        $content   = str_replace( '&#8217;', "'", $content );
        $mapNumber = $this->mapNumber++;
        $text      = <<<HTML
<div class="imageomap">
<script type="text/javascript">
//<![CDATA[
function imageomap_get_{$mapNumber}(){ {$content} return { map: map, markers: m, line:"{$line}", width:"{$width}", height:"{$height}" }; }
//]]
</script>
</div>
HTML;
        return $text;
    }

    /**
     * It is called when the footer part is set.
     */
    public function onWpFoot()
    {
        $this->setScript();
    }

    /**
     * It is called when the header part is set.
     */
    public function onWpHead()
    {
        echo "<link rel=\"stylesheet\" type=\"text/css\" href=\"{$this->pluginDirUrl}style.css\" />\n";
    }

    /**
     * It is called when the script output of WordPress is performed.
     */
    public function onWpPrintScripts()
    {
        wp_enqueue_script( 'jquery' );
        wp_enqueue_script( 'googlemap',   $this->googleMapScriptUrl );
        wp_enqueue_script( 'wpimageomap', $this->mapScriptUrl       );
    }

    /**
     * Embed the page JavaScript in your plug-ins.
     *
     * @param $isEdit True if edit mode. False otherwise. Specified value of default to false.
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
        else if( $this->mapNumber > 0 )
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
HTML;
        }
    }
}

// Create a plug-in instance
if( class_exists( 'WpImaGeoMap' ) )
{
    $wpImaGeoMap = new WpImaGeoMap();

    if( is_admin() )
    {
        /**
         * Executed when a dialog is launched from the media button.
         */
        function media_upload_imageomap()
        {
            wp_iframe( "media_upload_imageomap_form" );
        }

        /**
         * Output the contents of the dialog that is invoked from the media button.
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

?>