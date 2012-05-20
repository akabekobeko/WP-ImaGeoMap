<?php
/**
 * 指定された緯度と経度から標高を取得します。
 * 取得された標高は JSON 形式で標準出力に書き込まれます。
 *
 * 緯度・経度の指定が不正な場合や、取得に失敗した場合は空文字を書き込みます。
 */
function getElevation()
{
	$data = array( "altitude" => "" );

	$latitude  = ( isset( $_GET[ "latitude"  ] ) ? $_GET[ "latitude"  ] : -1 );
	$longitude = ( isset( $_GET[ "longitude" ] ) ? $_GET[ "longitude" ] : -1 );

	if( $latitude != -1 && $longitude != -1 )
	{
		$feed = "http://gisdata.usgs.gov/xmlwebservices2/elevation_service.asmx/getElevation?X_Value={$longitude}&Y_Value={$latitude}&Elevation_Units=METERS&Source_Layer=-1&Elevation_Only=true";
		$xml  = simplexml_load_file( $feed );

		if( $xml )
		{
			// 不正な緯度・経度を指定した場合は "-1.79769313486231E+308" という文字列が入るので、
			// 必ず数値判定を行って安全性を保証する必要がある。
			//
			$altitude = ( string )$xml;
			if( is_numeric( $altitude ) )
			{
				$data[ "altitude" ] = "{$altitude}m";
			}
		}
	}

	header( "Content-Type: application/json; charset=utf-8" );
	$json = json_encode( $data );
	echo "{$_GET[ 'callback' ]}({$json});";
}

getElevation();
?>