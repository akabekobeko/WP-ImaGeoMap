<?php

require_once( "php-calender-patch.php" );
require_once( "pel/PelJpeg.php"        );

/**
 * EXIF 情報の読み取り機能を提供します。
 */
class ExifReader
{
	/**
	 * EXIF の GPS 情報から GeoTag として値へ変換する。
	 *
	 * @param	$fraction	GPS 情報となる、分子・分母の計 2 要素の配列。
	 *
	 * @return	成功時は変換した値。失敗時は false。
	 */
	private function getGeoTagValue( $fraction )
	{
		$numerator   = ( double )$fraction[ 0 ];
		$denominator = ( double )$fraction[ 1 ];

		return ( $numerator / $denominator );
	}

	/**
	 * EXIF の GPS 情報から GeoTag を取得する。
	 *
	 * @param	$values	GPS 情報の配列 ( 度・分・秒 )。
	 *
	 * @return	成功時は GeoTag 用の値。失敗時は false。
	 */
	private function getGeoTagLocationValue( $values )
	{
		if( count( $values ) != 3 ) { return false; }

		$degrees = $this->getGeoTagValue( $values[ 0 ] );
		if( !$degrees ) { return false; }

		$minutes = $this->getGeoTagValue( $values[ 1 ] );
		if( !$minutes ) { return false; }

		$degmin = $degrees + ( $minutes / 60.0 );

		// 秒は記録されない事もあるので、取得できた時だけ計算に加える
		$seconds = $this->getGeoTagValue( $values[ 2 ] );
		return ( $seconds ? $degmin + ( $seconds / 3600 ) : $degmin );
	}

	/**
	 * 画像から読み取った IFD 情報を取得します。
	 *
	 * @param	$url	画像の URL。
	 *
	 * @return	成功時は IFD 情報。失敗時は false。
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
	 * 画像から読み取った EXIF 情報を取得します。
	 *
	 * @param	$url	画像の URL。
	 *
	 * @return	成功時は EXIF 情報。失敗時は false。
	 */
	public function read( $url )
	{
		$ifd = $this->getIfd( $url );
		if( !$ifd ) { return false; }

		$exif = array();

		// 撮影日時
		{
			$datetime = $this->readDateTime( $ifd );
			if( $datetime )
			{
				$exif[ "datetime" ] = $datetime;
			}
		}

		// GPS 情報
		$gps = $ifd->getSubIfd( PelIfd::GPS );
		if( $gps )
		{
			$v = $gps->getEntries();

			// 緯度
			if( isset( $v[ PelTag::GPS_LATITUDE_REF ] ) && isset( $v[ PelTag::GPS_LATITUDE ] ) )
			{
				$latitude = $this->getGeoTagLocationValue( $v[ PelTag::GPS_LATITUDE ]->getValue() );
				if( !$latitude ) { return false; }

				// 南半球なら負の値
				$direction = $v[ PelTag::GPS_LATITUDE_REF ]->getText();
				if( $direction == "S" )
				{
					$latitude *= -1;
				}

				$exif[ "latitude" ] = $latitude;
			}

			// 経度
			if( isset( $v[ PelTag::GPS_LONGITUDE_REF ] ) && isset( $v[ PelTag::GPS_LONGITUDE ] ) )
			{
				$longitude = $this->getGeoTagLocationValue( $v[ PelTag::GPS_LONGITUDE ]->getValue() );
				if( !$longitude ) { return false; }

				// 西半球なら負の値
				$direction = $v[ PelTag::GPS_LONGITUDE_REF ]->getText();
				if( $direction == "W" )
				{
					$longitude *= -1;
				}

				$exif[ "longitude" ] = $longitude;
			}

			// 測地系
			if( isset( $v[ PelTag::GPS_MAP_DATUM ] ) )
			{
				$exif[ "mapdatum" ] = $v[ PelTag::GPS_MAP_DATUM ]->getText();
			}

			// 標高
			if( isset( $v[ PelTag::GPS_ALTITUDE ] ) )
			{
				$altitude = $this->getGeoTagValue( $v[ PelTag::GPS_ALTITUDE ]->getValue() );
				if( $altitude )
				{
					$exif[ "altitude" ] = ( string )$altitude . "m";
				}
			}
		}

		return $exif;
	}

	/**
	 * 撮影日時を読み取ります。
	 *
	 * @param	$ifd	IFD 情報。
	 *
	 * @return	成功時は撮影日時。失敗時は false。
	 */
	private function readDateTime( $ifd )
	{
		$text = false;

		// 初めに DateTime ( IFD0 : 0x0132 ) をチェックする。
		// ここでデータが見つかれば、更なるデータ取得は不要となる。
		//
		$v = $ifd->getEntries();
		if( isset( $v[ PelTag::DATE_TIME ] ) )
		{
			$text = $v[ PelTag::DATE_TIME ]->getText();
		}
		else
		{
			// 次に DateTimeOriginal ( EXIF : 0x9003 ) をチェック
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
			// 撮影日の書式は "yyyy:MM:dd hh:mm:ss" の 19 文字となり、終端の NULL 文字と合わせて 20 バイトの文字列となる。
			// 日時の各桁は、データが存在しない場合はスペースで埋められる。
			//
			$chars = str_split( $text );
			$count = count( $chars );
			if( $count == 19 )
			{
				// 年と月の区切り文字をスラッシュに変換
				$chars[ 4 ] = "/";
				$chars[ 7 ] = "/";

				$text = implode( $chars );
			}
		}

		return $text;
	}
}

/**
 * EXIF を読み取り、その内容を JSON 形式のテキストとして出力します。
 */
function readExif()
{
	$data = array( "latitude" => 0, "longitude" => 0, "altitude" => "", "datetime" => "", "url" => "", "mapdatum" => "" );

	$url = $_GET[ "url" ];
	if( $url != null || $url != "" )
	{
		$data[ "url" ] = $url;
		$reader = new ExifReader();
		$exif = $reader->read( $url );
		if( $exif )
		{
			if( isset( $exif[ "latitude"  ] ) ) { $data[ "latitude"  ] = $exif[ "latitude"  ]; }
			if( isset( $exif[ "longitude" ] ) ) { $data[ "longitude" ] = $exif[ "longitude" ]; }
			if( isset( $exif[ "altitude"  ] ) ) { $data[ "altitude"  ] = $exif[ "altitude"  ]; }
			if( isset( $exif[ "mapdatum"  ] ) ) { $data[ "mapdatum"  ] = $exif[ "mapdatum"  ]; }
			if( isset( $exif[ "datetime"  ] ) ) { $data[ "datetime"  ] = $exif[ "datetime"  ]; }
		}
	}

	header( "Content-Type: application/json; charset=utf-8" );
	$json = json_encode( $data );
	echo "{$_GET[ 'callback' ]}({$json});";
}

/**
 * エラーが発生した時に呼び出されます。
 *
 * @param	$errno		エラー番号。
 * @param	$errmsg		エラーの内容。
 * @param	$filename	エラーが発生したファイル名。
 * @param	$linenum	エラーの発生行。
 * @param	$vars		エラー データ。
 */
function onError( $errno, $errmsg, $filename, $linenum, $vars )
{
	// 何もしない
}

// PEL でエラーが発生した場合、標準出力に Warning が書き込まれる為、jQuery.getJSON のコールバックが
// データを解釈できなくなるので、全てのエラーを無視するようにしておく。
// デバッグを行う場合は、以下の行をコメントアウトしてエラー出力を有効にする事！
//
set_error_handler("onError");

readExif();

?>