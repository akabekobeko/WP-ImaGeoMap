=== WP-ImaGeoMap ===
Contributors: akabeko
Donate:
Tags: map, image, post, media
Requires at least: 3.0.1
Tested up to: 3.4
Stable tag: 1.2
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Create a data with a combination of image and map, can be inserted into the article.

== Description ==

The main function is as follows.

* Associate the marker and image
* Put a marker at any point on the map
* Automatically set the position of the marker from the EXIF information of the image
* Automatically set the altitude and address from the position of the marker
* Attached a comment to marker

= How to use =

1. Show me the post page
1. Press the Wp-ImaGeoMap (looks like a marker) from the media button
1. Edit the data in the editor window
1. Press the 'Insert into Post' button
1. Short code will be inserted into the post

= Shortcode =
Shortcode is as follows.

    [imageomap width="100%" height="350px" line="line"]

Optional parameters is as follows.

* *width*: Width of a map, default is 100% ( Relative to the width of the article )
* *height*: Height of a map, default is 350px
* *line*: Set the 'line' if draw a line between markers, default is none

= Links =

* *Repository*: https://github.com/akabekobeko/WP-ImaGeoMap
* *Japanese article*: http://akabeko.me/blog/WP-ImaGeoMap

== Installation ==

1. Upload `wp-imageomap` to the `/wp-content/plugins/` directory
1. Activate the plugin through the 'Plugins' menu in WordPress

== Frequently Asked Questions ==

== Screenshots ==

1. WP-ImaGeoMap
1. Press the WP-ImaGeoMap (looks like a marker) from the media button
1. Editor window

== Changelog ==

= 1.2.1 =

* Fixed Bugs: Script error occurs Shortcodes WP-ImaGeoMap does not exist

= 1.2.0 =

* Fixed Bugs: That marker does not appear
* Fixed Bugs: Script error that occurred in the jQuery plug-in
* Fixed Bugs: Warning by WP_DEBUG
* Updated: Suppor for Retina display a UI
* Updated: UI parts design

= 1.1.0 =

* Updated: Add the settings that draw a line between markers
* Updated: Delayed timing to read the page to complete the map generation
* Updated: Do not show data if JavaScript is disabled

= 1.0.2 =

* Fixed Bugs: Removed the single quotes from property name of a JavaScript object that output

= 1.0.1 =

* Fixed Bugs: The change in the method getCenter get_center of Google Map API

= 1.0.0 =

* First release

== Arbitrary section ==
