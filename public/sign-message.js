/*
 * JavaScript client-side example using jsrsasign
 */

// #########################################################
// #             WARNING   WARNING   WARNING               #
// #########################################################
// #                                                       #
// # This file is intended for demonstration purposes      #
// # only.                                                 #
// #                                                       #
// # It is the SOLE responsibility of YOU, the programmer  #
// # to prevent against unauthorized access to any signing #
// # functions.                                            #
// #                                                       #
// # Organizations that do not protect against un-         #
// # authorized signing will be black-listed to prevent    #
// # software piracy.                                      #
// #                                                       #
// # -QZ Industries, LLC                                   #
// #                                                       #
// #########################################################

/**
 * Depends:
 *     - jsrsasign-latest-all-min.js
 *     - qz-tray.js
 *
 * Steps:
 *
 *     1. Include jsrsasign 10.9.0 into your web page
 *        <script src="https://cdnjs.cloudflare.com/ajax/libs/jsrsasign/11.1.0/jsrsasign-all-min.js"></script>
 *
 *     2. Update the privateKey below with contents from private-key.pem
 *
 *     3. Include this script into your web page
 *        <script src="path/to/sign-message.js"></script>
 *
 *     4. Remove or comment out any other references to "setSignaturePromise"
 *
 *     5. IMPORTANT: Before deploying to production, copy "jsrsasign-all-min.js"
 *        to the web server.  Don't trust the CDN above to be available.
 */
var privateKey = "-----BEGIN PRIVATE KEY-----\n" +
"MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1MEQ/om1+pNmA\n" +
"DxwE+3O1V3rcnQzj5eJIiEzDW+CgzGniiA8LVo0BanWhxe6ogiq7zPgV4S40/ki2\n" +
"sWXTi+GCowWoLsgIfJGYnhfDPXIqr0fXvE5t19BauSVpYihrBgRQQCrjOWVP9szl\n" +
"z8A1WM/y4ODYPn/Z1feoDU4to1crine/0L2Wdx/x45FMpAAwHaMIAi+he1QCnaXa\n" +
"2yFxipqz4yoXHdVaqQ3JL0OrGpHCqCocX6+AA3Aw7Dt6BhiFVYY84hXsW+vAR/Rd\n" +
"YhJdeqmaCXY/liD6dinZqpGfJVuUjj8+askgONGDI7+XMSj1nXV8snLQuUSQEZS6\n" +
"5S8f4s9dAgMBAAECggEARTEIbxCVJc7ILGoYtiJcPn0IsyTaXlFUh4RdZCE698z4\n" +
"BoUU0aycrlS8VSnkCL+kmBEfECPs5FnS5Ml77Dw3ww6EQ4SR6QPBCfodcvaNGZXU\n" +
"JqOHg9TtgSfBDKxqaOxkS00l054AfXfvKTeb3ANtbf/IfWvooQRfzfI+z5jX2g0i\n" +
"0GBiSJQMyNh5R6Nc73rvU7lBfbYRbl53yVDGdNjL/C7+/9kFFILmEURiZu75hgwp\n" +
"cuUP4H+CKHC5mp5k8KFde0rCEMbRog3LsIMgp7bInp0Wtpq0Hg9SDJmT4om+rU0U\n" +
"dzA8cN/AUhN+rPOreqEpd48xBNkPvRamo5wgZuDdVQKBgQDopqbkZkbJGgABT7CB\n" +
"OZVt4+hk3FXmlk8Mjm6jIfFiD0SmTfdIkQc64fXsaYAcDOefl2WY39LRi7W+5l5V\n" +
"ZTFeI6vU79qzCwarY4Nt1+8QpPWXJTDewowCw49wko5mGLjgiY5fuajHH+3JRJFN\n" +
"IbXTso5PecxvG/1o54NoFgKHCwKBgQDHX2yTSLGpANptPTvJz1NoXwDaCDOVNZAN\n" +
"Y54I2HL3eX5/DSRpr8ilo26d2m4nTgij0KfcM9Snm0BD2o1dpNP9vnAQccqHOg2Z\n" +
"zVWvfRy2VLDM/aM/vDYh2ZXHjg0Upp+o/ISRu3YEIRKAPtFSToCiu8iATMRXc5/u\n" +
"oimhcnbkNwKBgG08CjJFP0ke9w+mjfYuxlWBY9Uvivmoa1c27QWVY1OqXY5EHy4o\n" +
"Qh/IhoJJCsig2oQZPq+nr8GJen02huZLjAFqeDyTnbjhHXGNWOFTOME04sbjxG1j\n" +
"JQALOCcf+NJBG1T54Spa7r8H48rTcfGoOUo7lQwF4RHuL254/T76zpb/AoGALNpy\n" +
"+s+n6HWgrmLQSJ60DQ8Sifq+YBskxV5b93F6q+JRaxPx1TUO1vTlte2mSoFrwC75\n" +
"FLk0ZmCvHJTWqPKkHrnxTEHNZo7Q8IEZfdmP1BVJkVSenYAiTYs9/x8eIj86PDJT\n" +
"QNYDvvoRx3hab0Hp/rJwcSzUHziMCovBAelWhhECgYEA4ccyXi02oJD/LDdYdgqr\n" +
"n8/g1uojfuzbbseEC5MXYzmVg4aWvcmUrXkUs0IPMQYBqCDxaRlcMw0+4+qy3YIb\n" +
"JXlaIvHXhGyw9WJdLp9Rrtg3rV4X1MH05jm4rqwVMPxW1XAePca1LtV/nQ21vo7J\n" +
"EQKS00I3z8+xdRVtkdblt+w=\n" +
"-----END PRIVATE KEY-----\n";

qz.security.setSignatureAlgorithm("SHA512"); // Since 2.1
qz.security.setSignaturePromise(function(toSign) {
    return function(resolve, reject) {
        try {
            var pk = KEYUTIL.getKey(privateKey);
            var sig = new KJUR.crypto.Signature({"alg": "SHA512withRSA"});  // Use "SHA1withRSA" for QZ Tray 2.0 and older
            sig.init(pk); 
            sig.updateString(toSign);
            var hex = sig.sign();
            console.log("DEBUG: \n\n" + stob64(hextorstr(hex)));
            resolve(stob64(hextorstr(hex)));
        } catch (err) {
            console.error(err);
            reject(err);
        }
    };
});
