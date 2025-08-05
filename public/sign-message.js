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
var privateKey = 
"-----BEGIN PRIVATE KEY-----\n" +
"MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDFOKq6WqdxDb5O\n" +
"S1YDeNl/zW5zL0aTO+/0GYpGwpGOKfQwyEeY3zl8zf8izcp9MmBlluAZo8w/U9VS\n" +
"GoTEs68rl1G5wJ5LHI7b6K6UfqG1GVLPUFLIsxrIw0xlU80yMVbQXJsqOmyi8ESf\n" +
"xaETgEgi3bCRKMqdXOs4kPd6NZtQMQADhBYXJkDEoz0kuIP6FydWlaJNkK25fVox\n" +
"Vx0QzL3NOEhNgbKoTwTgQU6X9adeRXoFS/5RmSSAk6jd5JVKn9wSKm12Qy3+W+cS\n" +
"9SwVR6cBTTTVAXF6fcyb9z9U34FtWw2MjMeCP3dCKYw8n7ERrYUooXVDnh3CX8t9\n" +
"nRmvCiKNAgMBAAECggEAAb1INDCMfYDDhuk/LvSn5mqnaLioBLBoo1x+TbV1ly1j\n" +
"i/KYPw7o8OLYNzRdbtE87GhyPYemS4CvxvOY7Csxhk7lV6ANRVhRIjthHsonHvPE\n" +
"OTPaJw79U3v1dodQrfqla10FuU+emalI0afqjcN532TZI86aSt0A7hTJOfizD/f6\n" +
"suBeS/KKtSrwYmqz5aazSiZuYQrXWicO6PPPkq7Ze4FRyUkaXmeQaF7OYW81J2jH\n" +
"1jZ9RoKakTIeF1Msw394QGrhb2xPd6XBgPoetGiTpe0G9SDBYmA3GXn7DoysH2Nu\n" +
"XtnuXrSZwvt4lmr+aVbQWVXCOtLDKAqgD0OfszLQwQKBgQDoEXEktcmXGxpv/7fS\n" +
"ccFBobXZitu1sW6i0QhDbTbzxeSmEkRqyfhtMFPNgTu3mdAdI+vgHP/IRaO7rUBE\n" +
"C8yfqDzoJ/XnAtIPKahPgFBdPvZ6SoyftZZTmiqostbWhEsWTGuWM+YEaBdtDXwN\n" +
"sEXj4QzfM6RQ27RZ/4XAjFqseQKBgQDZj0avsLa5vEr+Jkr2eCBU8TuspdIGpm+v\n" +
"ZjB/9AHI/Fd9pSShjcJNTtYj+MqBp0FvCt0+ibDM0TjhCRr6I0L1mUKfvumr++Hq\n" +
"MFT5lGX9W0kM2k6AqLxM2lhPiHcYuW0VPjl0WIyecP+10lByg2inahRWBq2hI+M0\n" +
"a6EbpnF5tQKBgApfJTBf04emVXMl+aA1J074nDkBxLoFGQ27y+O/kNIqSQLHFDm1\n" +
"lx3CKCyqFvIotK1oupUElsXrntq3boTcBiQoj7hMeOf/L0YwNW6ALJdORhPHGyvU\n" +
"IMjRvhBWFdX2iaiQd8p5vVD7GfjsvluaQjViDII5O6HFf/T5v4+Qdkj5AoGAGS30\n" +
"72aTb2G0iD+kU2xJyar1ziCO80gWCwXXvSdfgYR7F8aiO7RtdYcXT6h+v4y9DP4D\n" +
"5zYGaV4ZqCnmnmawXD51sIlnAAmx9unLG+up9i23ga5OgaOFz5tBt0rDBfCICHpg\n" +
"KfAJrljDr6Z8uxQsa5viaKZzOAAwTqPaTJnx7jUCgYBVRvVH/os7d9JzeAgyyyKd\n" +
"WgDBzDmk5NrEizklWm+dPomVZU2n1MTO4P6ePQ7Ihpa6n6LQZ4K08UCvd49dgkVE\n" +
"1pd7a34VVl1pG/f1l1rz3RRRoL4VYTlAKza2rAst0o3Ejb5NRbBAQfhN7ewdUgHv\n" +
"vBhkReHLxIfbXDLob6BUcg==\n" +
"-----END PRIVATE KEY-----"

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
