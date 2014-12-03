/*
	WebPlotDigitizer - http://arohatgi.info/WebPlotDigitizer

	Copyright 2010-2014 Ankit Rohatgi <ankitrohatgi@hotmail.com>

	This file is part of WebPlotDigitizer.

    WebPlotDigitizer is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    WebPlotDigitizer is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with WebPlotDigitizer.  If not, see <http://www.gnu.org/licenses/>.


*/

wpd = wpd || {};

// TODO: reduce the number of rgb and lab conversions used in this code.
wpd.ColorGroup = (function () {
    var CGroup = function(tolerance) {

        var totalPixelCount = 0,
            averageColorLab = {l: 0, a: 0, b: 0},
            averageColor = {r: 0, g: 0, b: 0};

        tolerance = tolerance == null ? 100 : tolerance;

        this.getPixelCount = function () {
            return totalPixelCount;
        }

        this.getAverageColor = function () {
            // return averageColor;
            var lab = [averageColorLab.l, averageColorLab.a, averageColorLab.b]
            var rgb = wpd.colorTools.labToRgb(lab)
            return {r: rgb[0], g: rgb[1], b: rgb[2]}
        }

        this.isColorInGroup = function (r, g, b) {
            if (totalPixelCount === 0) {
                return true;
            }
            // var dist = (averageColor.r - r)*(averageColor.r - r)
            //     + (averageColor.g - g)*(averageColor.g - g)
            //     + (averageColor.b - b)*(averageColor.b - b);

            // return (dist <= tolerance*tolerance);

            // var rgb = [averageColor.r, averageColor.g, averageColor.b]
            var lab = [averageColorLab.l, averageColorLab.a, averageColorLab.b]
            var rgb = wpd.colorTools.labToRgb(lab)
            var dist = wpd.colorTools.colorDistance(rgb, [r, g, b]);

            return (dist <= tolerance);

        };

        this.addPixel = function (r, g, b) {
            // averageColor.r = (averageColor.r*totalPixelCount + r)/(totalPixelCount + 1.0);
            // averageColor.g = (averageColor.g*totalPixelCount + g)/(totalPixelCount + 1.0);
            // averageColor.b = (averageColor.b*totalPixelCount + b)/(totalPixelCount + 1.0);
            var lab = wpd.colorTools.rgbToLab([r, g, b])
            var l = lab[0]
            var a = lab[1]
            var b1 = lab[2]
            averageColorLab.l = (averageColorLab.l*totalPixelCount + l)/(totalPixelCount + 1.0);
            averageColorLab.a = (averageColorLab.a*totalPixelCount + a)/(totalPixelCount + 1.0);
            averageColorLab.b = (averageColorLab.b*totalPixelCount + b1)/(totalPixelCount + 1.0);
            totalPixelCount = totalPixelCount + 1;
        };

    };
    return CGroup;
})();



wpd.colorAnalyzer = (function () {
    function getTopColors(imageData) {
        return getTopColorsWithTolerance(imageData, 120)
    }

    function getTopColorsWithTolerance (imageData, tolerance) {

        var colorGroupColl = [], // collection of color groups
            pixi,
            r, g, b,
            groupi,
            groupMatched,
            rtnVal = [],
            avColor

        colorGroupColl[0] = new wpd.ColorGroup(tolerance); // initial group

        for (pixi = 0; pixi < imageData.data.length; pixi += 4) {
            r = imageData.data[pixi];
            g = imageData.data[pixi + 1];
            b = imageData.data[pixi + 2];

            groupMatched = false;

            for (groupi = 0; groupi < colorGroupColl.length; groupi++) {
                if (colorGroupColl[groupi].isColorInGroup(r, g, b)) {
                    colorGroupColl[groupi].addPixel(r, g, b);
                    groupMatched = true;
                    break;
                }
            }

            if (!groupMatched) {
                colorGroupColl[colorGroupColl.length] = new wpd.ColorGroup(tolerance);
                colorGroupColl[colorGroupColl.length - 1].addPixel(r, g, b);
            }
        }

        // sort groups
        colorGroupColl.sort(function(a, b) {
            if ( a.getPixelCount() > b.getPixelCount() ) {
                return -1;
            } else if (a.getPixelCount() < b.getPixelCount() ) {
                return 1;
            }
            return 0;
        });

        for (groupi = 0; groupi < colorGroupColl.length; groupi++) {

            avColor = colorGroupColl[groupi].getAverageColor();

            rtnVal[groupi] = {
                r: parseInt(avColor.r, 10),
                g: parseInt(avColor.g, 10),
                b: parseInt(avColor.b, 10),
                pixels: colorGroupColl[groupi].getPixelCount(),
                percentage: 100.0*colorGroupColl[groupi].getPixelCount()/(0.25*imageData.data.length)
            };
        }

        return rtnVal;
    }

    return {
        getTopColors: getTopColors,
        getTopColorsWithTolerance: getTopColorsWithTolerance

    };
})();

wpd.colorTools = (function () {
  function colorDistance(rgb1, rgb2) {
    return cie2000(rgbToLab(rgb1), rgbToLab(rgb2))
  }

  // http://html5hub.com/exploring-color-matching-in-javascript/
  // http://www.easyrgb.com/index.php?X=MATH
  // http://en.wikipedia.org/wiki/Color_difference
  // Convert RGB to XYZ
  function rgbToXyz(rgb) {
      var r = rgb[0]
      var g = rgb[1]
      var b = rgb[2]

      var _r = (r / 255);
      var _g = (g / 255);
      var _b = (b / 255);

      if (_r > 0.04045) {
          _r = Math.pow(((_r + 0.055) / 1.055), 2.4);
      }
      else {
          _r = _r / 12.92;
      }

      if (_g > 0.04045) {
          _g = Math.pow(((_g + 0.055) / 1.055), 2.4);
      }
      else {
          _g = _g / 12.92;
      }

      if (_b > 0.04045) {
          _b = Math.pow(((_b + 0.055) / 1.055), 2.4);
      }
      else {
          _b = _b / 12.92;
      }

      _r = _r * 100;
      _g = _g * 100;
      _b = _b * 100;

      X = _r * 0.4124 + _g * 0.3576 + _b * 0.1805;
      Y = _r * 0.2126 + _g * 0.7152 + _b * 0.0722;
      Z = _r * 0.0193 + _g * 0.1192 + _b * 0.9505;

      return [X, Y, Z];
  };

  // Convert XYZ to LAB
  function xyzToLab(xyz) {
      var x = xyz[0]
      var y = xyz[1]
      var z = xyz[2]

      var ref_X =  95.047;
      var ref_Y = 100.000;
      var ref_Z = 108.883;

      var _X = x / ref_X;
      var _Y = y / ref_Y;
      var _Z = z / ref_Z;

      if (_X > 0.008856) {
           _X = Math.pow(_X, (1/3));
      }
      else {
          _X = (7.787 * _X) + (16 / 116);
      }

      if (_Y > 0.008856) {
          _Y = Math.pow(_Y, (1/3));
      }
      else {
        _Y = (7.787 * _Y) + (16 / 116);
      }

      if (_Z > 0.008856) {
          _Z = Math.pow(_Z, (1/3));
      }
      else {
          _Z = (7.787 * _Z) + (16 / 116);
      }

      var CIE_L = (116 * _Y) - 16;
      var CIE_a = 500 * (_X - _Y);
      var CIE_b = 200 * (_Y - _Z);

      return [CIE_L, CIE_a, CIE_b];
  };

  // Finally, use cie1994 to get delta-e using LAB
  function cie1994(lab1, lab2) {
      var WHTL = 1.1
      var WHTC = 1
      var WHTH = 1
      var lab1 = {l: lab1[0], a: lab1[1], b: lab1[2]};
      var lab2 = {l: lab2[0], a: lab2[1], b: lab2[2]};

      var xC1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
      var xC2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
      var xDL = lab2.l - lab1.l;
      var xDC = xC2 - xC1;

      var dl = lab1.l - lab2.l;
      var da = lab1.a - lab2.a;
      var db = lab1.b - lab2.b;
      var xDE = Math.sqrt(dl * dl + da * da + db * db)
      var xDH;
      if (Math.sqrt(xDE) > Math.sqrt(Math.abs(xDL)) + Math.sqrt(Math.abs(xDC))) {
        xDH = Math.sqrt(xDE * xDE - xDL * xDL - xDC * xDC )
      } else {
        xDH = 0
      }
      var xSC = 1 + (0.045 * xC1)
      var xSH = 1 + (0.015 * xC1)
      xDL /= WHTL
      xDC /= WHTC * xSC
      xDH /= WHTH * xSH

      return Math.sqrt(xDL * xDL + xDC * xDC + xDH * xDH);
  };

  // Based on easyRGB but the pseudocode was a little unclear
  // If not working, switch back to cie1994
  function cie2000(lab1, lab2) {
      var WHTL = 1
      var WHTC = 1
      var WHTH = 1
      var lab1 = {l: lab1[0], a: lab1[1], b: lab1[2]};
      var lab2 = {l: lab2[0], a: lab2[1], b: lab2[2]};

      var xC1, xC2, xCX, xGX, xNN, xH1, xH2, xDL, xDC, xDH, xLX, xCY, xHX, xTX, xPH, xRC, xSL, xSC, xSH, xRT
      xC1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
      xC2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
      xCX = ( xC1 + xC2 ) / 2
      xGX = 0.5 * ( 1 - Math.sqrt( Math.pow(xCX, 7 ) / ( Math.pow(xCX, 7) + Math.pow(25, 7) ) ) )
      xNN = ( 1 + xGX ) * lab1.a
      xC1 = Math.sqrt( xNN * xNN + lab1.b * lab1.b )
      xH1 = CieLab2Hue( xNN, lab1.b )
      xNN = ( 1 + xGX ) * lab2.a
      xC2 = Math.sqrt( xNN * xNN + lab2.b * lab2.b )
      xH2 = CieLab2Hue( xNN, lab2.b )
      xDL = lab2.l - lab1.l
      xDC = xC2 - xC1
      if ( ( xC1 * xC2 ) == 0 ) {
        xDH = 0
      } else {
        xNN = Math.round(xH2 - xH1)
        if ( Math.abs( xNN ) <= 180 ) {
          xDH = xH2 - xH1
        } else {
          if ( xNN > 180 ) {
            xDH = xH2 - xH1 - 360
          } else {
            xDH = xH2 - xH1 + 360
          }
        }
      }
      xDH = 2 * Math.sqrt( xC1 * xC2 ) * Math.sin( xDH / 2 * Math.PI / 180 )
      xLX = ( lab1.l + lab2.l ) / 2
      xCY = ( xC1 + xC2 ) / 2
      if ( ( xC1 *  xC2 ) == 0 ) {
       xHX = xH1 + xH2
      } else {
        xNN = Math.abs( Math.round( xH1 - xH2 ) )
        if ( xNN >  180 ) {
            if ( ( xH2 + xH1 ) <  360 ) {
                xHX = xH1 + xH2 + 360
            } else {
               xHX = xH1 + xH2 - 360
            }
        } else {
          xHX = xH1 + xH2
        }
        xHX /= 2
    }
    xTX = 1 - 0.17 * Math.cos( ( xHX - 30 ) * Math.PI / 180 ) + 0.24
               * Math.cos( ( 2 * xHX ) * Math.PI / 180 ) + 0.32
               * Math.cos( ( 3 * xHX + 6 ) * Math.PI / 180 ) - 0.20
               * Math.cos( ( 4 * xHX - 63 ) * Math.PI / 180 )
    xPH = 30 * Math.exp( - ( ( xHX  - 275 ) / 25 ) * ( ( xHX  - 275 ) / 25 ) )
    xRC = 2 * Math.sqrt( Math.pow(xCY, 7 ) / ( Math.pow(xCY, 7) + Math.pow(25, 7) ) )
    xSL = 1 + ( ( 0.015 * ( ( xLX - 50 ) * ( xLX - 50 ) ) ) / Math.sqrt( 20 + ( ( xLX - 50 ) * ( xLX - 50 ) ) ) )
    xSC = 1 + 0.045 * xCY
    xSH = 1 + 0.015 * xCY * xTX
    xRT = - Math.sin(( 2 * xPH ) * Math.PI / 180) * xRC
    xDL = xDL / ( WHTL * xSL )
    xDC = xDC / ( WHTC * xSC )
    xDH = xDH / ( WHTH * xSH )
    return Math.sqrt( xDL * xDL + xDC * xDC + xDH * xDH + xRT * xDC * xDH )
  }

  //Function returns CIE-H° value
  function CieLab2Hue( var_a, var_b ) {
    var var_bias = 0
    if ( var_a >= 0 && var_b == 0 ) {
        return 0
    }
    if ( var_a <  0 && var_b == 0 ) {
        return 180
    }
    if ( var_a == 0 && var_b >  0 ) {
        return 90
    }
    if ( var_a == 0 && var_b <  0 ) {
        return 270
    }

    if ( var_a >  0 && var_b >  0 ) {
        var_bias = 0
    }
    if ( var_a <  0 ) {
        var_bias = 180
    }
    if ( var_a >  0 && var_b <  0 ) {
        var_bias = 360
    }

    return ( Math.atan( var_b / var_a ) * 180 / Math.PI + var_bias )
  }

  function labToXyz(lab) {
    var CIE_L = lab[0]
    var CIE_a = lab[1]
    var CIE_b = lab[2]

    var ref_X =  95.047;
    var ref_Y = 100.000;
    var ref_Z = 108.883;

    var var_Y = ( CIE_L + 16 ) / 116
    var var_X = CIE_a / 500 + var_Y
    var var_Z = var_Y - CIE_b / 200

    if ( Math.pow(var_Y, 3) > 0.008856 ) {
        var_Y = Math.pow(var_Y, 3)
    } else {
        var_Y = ( var_Y - 16 / 116 ) / 7.787
    }

    if ( Math.pow(var_X, 3) > 0.008856 ) {
        var_X = Math.pow(var_X, 3)
    } else {
        var_X = ( var_X - 16 / 116 ) / 7.787
    }
    if ( Math.pow(var_Z, 3) > 0.008856 ) {
        var_Z = Math.pow(var_Z, 3)
    } else {
        var_Z = ( var_Z - 16 / 116 ) / 7.787
    }

    var X = ref_X * var_X     //ref_X =  95.047     Observer= 2°, Illuminant= D65
    var Y = ref_Y * var_Y     //ref_Y = 100.000
    var Z = ref_Z * var_Z     //ref_Z = 108.883

    return [X, Y, Z]
  }

  function xyzToRgb(xyz) {
    var X = xyz[0]
    var Y = xyz[1]
    var Z = xyz[2]

    var var_X = X / 100        //X from 0 to  95.047      (Observer = 2°, Illuminant = D65)
    var var_Y = Y / 100        //Y from 0 to 100.000
    var var_Z = Z / 100        //Z from 0 to 108.883

    var var_R = var_X *  3.2406 + var_Y * -1.5372 + var_Z * -0.4986
    var var_G = var_X * -0.9689 + var_Y *  1.8758 + var_Z *  0.0415
    var var_B = var_X *  0.0557 + var_Y * -0.2040 + var_Z *  1.0570

    if ( var_R > 0.0031308 ) {
        var_R = 1.055 * Math.pow(var_R, 1 / 2.4) - 0.055
    } else {
        var_R = 12.92 * var_R
    }

    if ( var_G > 0.0031308 ) {
        var_G = 1.055 * Math.pow(var_G, 1 / 2.4) - 0.055
    } else {
        var_G = 12.92 * var_G
    }

    if ( var_B > 0.0031308 ) {
        var_B = 1.055 * Math.pow(var_B, 1 / 2.4) - 0.055
    } else {
        var_B = 12.92 * var_B
    }

    var R = var_R * 255
    var G = var_G * 255
    var B = var_B * 255

    return [R, G, B]
  }

  function rgbToLab(rgb) {
    return xyzToLab(rgbToXyz(rgb))
  }

  function labToRgb(lab) {
    return xyzToRgb(labToXyz(lab))
  }

  return {
    colorDistance: colorDistance,
    cie1994: cie1994,
    rgbToLab: rgbToLab,
    labToRgb: labToRgb
  }

})();

