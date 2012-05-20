<?php

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Class for calender functions.
 * It transplanted it from PHP Calendar API ( calendar.c, cal_unix.c, ...etc ).
 */
class CalendarUtility
{
	const DAYS_PER_400_YEARS = 146097;
	const DAYS_PER_4_YEARS   = 1461;
	const DAYS_PER_5_MONTHS  = 153;
	const GREGOR_SDN_OFFSET  = 32045;

	/**
	 * Converts a Gregorian date to Julian Day Count
	 *
	 * @param	The month as a number from 1 (for January) to 12 (for December)
	 * @param	The day as a number from 1 to 31
	 * @param	The year as a number between -4714 and 9999
	 *
	 * @return 	The julian day for the given gregorian date as an integer.
	 */
	static public function gregoriantojd( $month, $day, $year )
	{
		return CalendarUtility::gregorianToSdn( $year, $month, $day );
	}

	/**
	 * Converts Julian Day Count to Gregorian date
	 *
	 * @param	A julian day number as integer
	 *
	 * @return	The gregorian date as a string in the form "month/day/year"
	 */
	static public function jdtogregorian( $julianday )
	{
		CalendarUtility::sdnToGregorian( $julianday, $year, $month, $day );
		return sprintf( "%d/%d/%d", $month, $day, $year );
	}

	/**
	 * Convert Julian Day to Unix timestamp
	 *
	 * @param A julian day number between 2440588 and 2465342
	 *
	 * @return The unix timestamp for the start of the given julian day.
	 */
	static public function jdtounix( $jday )
	{
		$uday = $jday - 2440588;
		if( $uday < 0 || 24755 < $uday ) { return false; }

		return ( $uday * 24 * 3600 );
	}

	/**
	 * Convert Unix timestamp to Julian Day
	 *
	 * @param A unix timestamp to convert.
	 *
	 * @return A julian day number as integer.
	 */
	static public function unixtojd( $timestamp )
	{
		if( $timestamp == null || $timestamp == "" )
		{
			$timestamp = time();
		}

		$ta = localtime( $timestamp, true );
		return CalendarUtility::gregorianToSdn( $ta[ "tm_year" ] + 1900, $ta[ "tm_mon" ] + 1, $ta[ "tm_mday" ] );
	}

	/**
	 * Converts a Gregorian date to SDN.
	 *
	 * @param year.
	 * @param month.
	 * @param day.
	 *
	 * @return SDN data.
	 */
	static private function gregorianToSdn( $inputYear, $inputMonth, $inputDay )
	{
		// check for invalid dates
		if( $inputYear  == 0 || $inputYear  < -4714 ||
			$inputMonth <= 0 || $inputMonth >    12 ||
			$inputDay   <= 0 || $inputDay   >    31 )
		{
			return 0;
		}

		// check for dates before SDN 1
		if( $inputYear == -4714 && ( $inputMonth < 11 || $inputMonth == 11 && $inputDay < 25 ) ) { return (0); }

		// Make year always a positive number.
		$year = ($inputYear < 0 ? $inputYear + 4801 : $inputYear + 4800);

		// Adjust the start of the year.
		$month = 0;
		if( $inputMonth > 2 )
		{
			$month = $inputMonth - 3;
		}
		else
		{
			$month = $inputMonth + 9;
			$year--;
		}

		$y  = ( int )( ( ( int )($year / 100 ) * CalendarUtility::DAYS_PER_400_YEARS ) / 4 );
		$y2 = ( int )( ( ( int )($year % 100 ) * CalendarUtility::DAYS_PER_4_YEARS   ) / 4 );
		$m  = ( int )( ( $month * CalendarUtility::DAYS_PER_5_MONTHS + 2 ) / 5 );

		return ( $y + $y2 + $m + $inputDay - CalendarUtility::GREGOR_SDN_OFFSET );
	}

	/**
	 * Converts a SDN to Gregorian date.
	 *
	 * @param SDN.
	 * @param result year.
	 * @param result month.
	 * @param result day.
	 */
	static private function sdnToGregorian( $sdn, &$pYear, &$pMonth, &$pDay )
	{
		if( $sdn <= 0 )
		{
			 $pYear  = 0;
			 $pMonth = 0;
			 $pDay   = 0;
			 return;
		}

		$temp = ( int )( ( $sdn + CalendarUtility::GREGOR_SDN_OFFSET ) * 4 - 1 );
		if( $temp < 0 )
		{
			 $pYear  = 0;
			 $pMonth = 0;
			 $pDay   = 0;
			 return;
		}

		// Calculate the century (year/100).
		$century = ( int )( $temp / CalendarUtility::DAYS_PER_400_YEARS );

		// Calculate the year and day of year (1 <= dayOfYear <= 366).
		$temp      = ( int )( ( int )( ( $temp % CalendarUtility::DAYS_PER_400_YEARS ) / 4 ) * 4 + 3 );
		$year      = ( int )( ( $century * 100 ) + ( $temp / CalendarUtility::DAYS_PER_4_YEARS ) );
		$dayOfYear = ( int )( ( $temp % CalendarUtility::DAYS_PER_4_YEARS ) / 4 + 1 );

		// Calculate the month and day of month.
		$temp = $dayOfYear * 5 - 3;
		$month = ( int )( $temp / CalendarUtility::DAYS_PER_5_MONTHS );
		$day   = ( int )( ( $temp % CalendarUtility::DAYS_PER_5_MONTHS ) / 5 ) + 1;

		// Convert to the normal beginning of the year.
		if( $month < 10 )
		{
			 $month += 3;
		}
		else
		{
			 $year  += 1;
			 $month -= 9;
		}

		// Adjust to the B.C./A.D. type numbering.
		$year -= 4800;
		if( $year <= 0 ) { $year--; }

		$pYear  = $year;
		$pMonth = $month;
		$pDay   = $day;
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// gregoriantojd
//
if( !function_exists( gregoriantojd ) )
{
	/**
	 * Converts a Gregorian date to Julian Day Count
	 *
	 * @param	The month as a number from 1 (for January) to 12 (for December)
	 * @param	The day as a number from 1 to 31
	 * @param	The year as a number between -4714 and 9999
	 *
	 * @return 	The julian day for the given gregorian date as an integer.
	 */
	function gregoriantojd( $month, $day, $year )
	{
		return CalendarUtility::gregoriantojd( $month, $day, $year );
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// jdtogregorian
//
if( !function_exists( jdtogregorian ) )
{
	/**
	 * Converts Julian Day Count to Gregorian date
	 *
	 * @param	A julian day number as integer
	 *
	 * @return	The gregorian date as a string in the form "month/day/year"
	 */
	function jdtogregorian( $julianday )
	{
		return CalendarUtility::jdtogregorian( $julianday );
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// jdtounix
//
if( !function_exists( jdtounix ) )
{
	/**
	 * Convert Julian Day to Unix timestamp
	 *
	 * @param A julian day number between 2440588 and 2465342
	 *
	 * @return The unix timestamp for the start of the given julian day.
	 */
	function jdtounix( $jday )
	{
		return CalendarUtility::jdtounix( $jday );
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// unixtojd
//
if( !function_exists( unixtojd ) )
{
	/**
	 * Convert Unix timestamp to Julian Day
	 *
	 * @param A unix timestamp to convert.
	 *
	 * @return A julian day number as integer.
	 */
	function unixtojd( $timestamp )
	{
		return CalendarUtility::unixtojd( $timestamp );
	}
}
?>