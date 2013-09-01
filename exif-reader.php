<?php

require_once( 'pel/src/PelJpeg.php'        );

/**
 * Read the EXIF information.
 */
class ExifReader
{
    /**
     * Convert to the value of GeoTag GPS information of EXIF.
     *
     * @param $fraction GPS value ( Numerator and Denominator ).
     *
     * @return Converted value on success. False otherwise.
     */
    private function getGeoTagValue( $fraction )
    {
        $numerator   = ( double )$fraction[ 0 ];
        $denominator = ( double )$fraction[ 1 ];

        return ( $numerator / $denominator );
    }

    /**
     * Get GeoTag from GPS information of EXIF.
     *
     * @param $values GPS information array ( Degrees, Minutes and Second )。
     *
     * @return GeoTag on success. False otherwise.
     */
    private function getGeoTagLocationValue( $values )
    {
        if( count( $values ) != 3 ) { return false; }

        $degrees = $this->getGeoTagValue( $values[ 0 ] );
        if( !$degrees ) { return false; }

        $minutes = $this->getGeoTagValue( $values[ 1 ] );
        if( !$minutes ) { return false; }

        $degmin = $degrees + ( $minutes / 60.0 );

        // Because there is that second is not recorded, is added to the calculation only when you can get.
        $seconds = $this->getGeoTagValue( $values[ 2 ] );
        return ( $seconds ? $degmin + ( $seconds / 3600 ) : $degmin );
    }

    /**
     * Read the IFD from image
     *
     * @param $url Image URL.
     *
     * @return IFD on success. False otherwise.
     */
    private function getIfd( $url )
    {
        try
        {
            $jpeg = new PelJpeg( $url );
            $app1 = $jpeg->getExif();
            if( !$app1 ) { return false; }

            $tiff = $app1->getTiff();
            if( !$tiff ) { return false; }

            return $tiff->getIfd();
        }
        catch( Exception $e )
        {
            return false;
        }
    }

    /**
     * Read the EXIF from image
     *
     * @param $url Image URL.
     *
     * @return EXIF on success. False otherwise.
     */
    public function read( $url )
    {
        $ifd = $this->getIfd( $url );
        if( !$ifd ) { return false; }

        $exif = array();

        // Shooting datetime
        {
            $datetime = $this->readDateTime( $ifd );
            if( $datetime )
            {
                $exif[ 'datetime' ] = $datetime;
            }
        }

        // GPS information
        $gps = $ifd->getSubIfd( PelIfd::GPS );
        if( $gps )
        {
            $v = $gps->getEntries();

            // Latitude
            if( isset( $v[ PelTag::GPS_LATITUDE_REF ] ) && isset( $v[ PelTag::GPS_LATITUDE ] ) )
            {
                $latitude = $this->getGeoTagLocationValue( $v[ PelTag::GPS_LATITUDE ]->getValue() );
                if( !$latitude ) { return false; }

                // To a negative value if the Southern Hemisphere.
                $direction = $v[ PelTag::GPS_LATITUDE_REF ]->getText();
                if( $direction == 'S' )
                {
                    $latitude *= -1;
                }

                $exif[ 'latitude' ] = $latitude;
            }

            // Longitude
            if( isset( $v[ PelTag::GPS_LONGITUDE_REF ] ) && isset( $v[ PelTag::GPS_LONGITUDE ] ) )
            {
                $longitude = $this->getGeoTagLocationValue( $v[ PelTag::GPS_LONGITUDE ]->getValue() );
                if( !$longitude ) { return false; }

                // To a negative value if the Western Hemisphere.
                $direction = $v[ PelTag::GPS_LONGITUDE_REF ]->getText();
                if( $direction == 'W' )
                {
                    $longitude *= -1;
                }

                $exif[ 'longitude' ] = $longitude;
            }

            // Datum ( Use the conversion of locations )
            if( isset( $v[ PelTag::GPS_MAP_DATUM ] ) )
            {
                $exif[ 'mapdatum' ] = $v[ PelTag::GPS_MAP_DATUM ]->getText();
            }

            // Elevation
            if( isset( $v[ PelTag::GPS_ALTITUDE ] ) )
            {
                $altitude = $this->getGeoTagValue( $v[ PelTag::GPS_ALTITUDE ]->getValue() );
                if( $altitude )
                {
                    $exif[ 'altitude' ] = ( string )$altitude;
                }
            }
        }

        return $exif;
    }

    /**
     * Read the shooting datetime.
     *
     * @param $ifd IFD information.
     *
     * @return Shooting datetime on success. False otherwise.
     */
    private function readDateTime( $ifd )
    {
        $text = false;

        // Check the DateTime ( IFD0 : 0x0132 ).
        // Data is found here, data acquisition further unnecessary.
        //
        $v = $ifd->getEntries();
        if( isset( $v[ PelTag::DATE_TIME ] ) )
        {
            $text = $v[ PelTag::DATE_TIME ]->getText();
        }
        else
        {
            // Check the DateTimeOriginal ( EXIF : 0x9003 ).
            $subIfd = $ifd->getSubIfd( PelIfd::EXIF );
            if( $subIfd )
            {
                $v = $subIfd->getEntries();
                if( isset( $v[ PelTag::DATE_TIME_ORIGINAL ] ) )
                {
                    $text = $v[ PelTag::DATE_TIME_ORIGINAL ]->getText();
                }
            }
        }

        if( $text )
        {
            $chars = str_split( $text );
            $count = count( $chars );
            if( $count == 19 )
            {
                // replace the separator of Year and Month.
                $chars[ 4 ] = '/';
                $chars[ 7 ] = '/';

                $text = implode( $chars );
            }
        }

        return $text;
    }
}

/**
 * Reads the EXIF, and then output as text in JSON format its contents.
 */
function readExif()
{
    $data = array( 'latitude' => 0, 'longitude' => 0, 'altitude' => '', 'datetime' => '', 'url' => '', 'mapdatum' => '' );

    $url = $_GET[ 'url' ];
    if( $url )
    {
        $data[ 'url' ] = $url;
        $reader = new ExifReader();
        $exif = $reader->read( $url );
        if( $exif )
        {
            if( isset( $exif[ 'latitude'  ] ) ) { $data[ 'latitude'  ] = $exif[ 'latitude'  ]; }
            if( isset( $exif[ 'longitude' ] ) ) { $data[ 'longitude' ] = $exif[ 'longitude' ]; }
            if( isset( $exif[ 'altitude'  ] ) ) { $data[ 'altitude'  ] = $exif[ 'altitude'  ]; }
            if( isset( $exif[ 'mapdatum'  ] ) ) { $data[ 'mapdatum'  ] = $exif[ 'mapdatum'  ]; }
            if( isset( $exif[ 'datetime'  ] ) ) { $data[ 'datetime'  ] = $exif[ 'datetime'  ]; }
        }
    }

    header( 'Content-Type: application/javascript; charset=utf-8' );
    $json = json_encode($data);
    echo $_GET[ 'callback' ] . '(' . $json . ');';
    //echo json_encode( $data );
}

/**
 * Error handler, passes flow over the exception logger with new ErrorException.
 *
 * @param $errno    Error number
 * @param $errmsg   Error message.
 * @param $filename File name.
 * @param $linenum  Line number.
 * @param $vars     Error data.
 */
function onError( $errno, $errmsg, $filename, $linenum, $vars )
{
    // Disable
}

// Disable error handler
set_error_handler( 'onError' );

readExif();

?>