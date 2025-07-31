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
"MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCVyIt4VXx5avFW\n" +
"5+piwsLxCMtSd0YR5mgRye171pcqndtmhnktvZY2cOzV4aUoaqdAS3whNo1jYiPc\n" +
"UeXt6uEjXcfgv67b6I/Q07MDXy+/xeFfxkAjk/elotTNrZFVSlwWoKTRdmPJjK2C\n" +
"3bsY+j+IYjLajfONSfR9auk7T//1SAsLaObSsY9pkFCduMT8235mG6R8EXSY6aL9\n" +
"pNfj1xCwSVqFdKEPXWzyH6UACaHMKReHnCyXLgDfQi/G0jZXM6U4gOdzbW6RvfgC\n" +
"+ZDpUo/HZrOb34GeYik2YfR2X2A+k+Xn0aF7oYoWydOCl6mVbxtB2jLLaKmmgiYH\n" +
"LLzDQHVVAgMBAAECggEAC5NxO/6XXSbnugi4c6OLv2cnl5sCPlXpSx6pDP4btr52\n" +
"e2j/KorRdimqFCmZQxNjE7QBxutZaAnorZlixM13Uu1nijYmRHanzsLdve/4V8Dq\n" +
"VyWSRW2lIRcBjVfRuJ7DmTgXJN0afzQxIMEUOaz1hgvY1E1OOmgxzhOaLOxU4tbt\n" +
"QqjocuR38aPuIQjzbBlGn2R9TU8n7VkDVYB727NHjE36HmuGkoaA4DHewQimaqEi\n" +
"yExGD0sBi1jv/la2dZtJyc13vb7FZNoIcZv6f5/+LOxtTCTBoO8Hj4MK+7v5J2FY\n" +
"IWjicvD4bwitBhhh2cFXm2qYYEoWR9IAOCY9UIEfrQKBgQDKgNR6hfV3h0Nhk0Rr\n" +
"GDR6E1eVUvcqxnjjTMVjc2QRb5Bn8nn411kLHOVRAGdulTCiNK3O0L3DucEr45jd\n" +
"9yB9eUDot34ZZ+XUdbL2Qny7bTtaIbYBvIr9b4snr87RYtJrEpZWIzmpRC+O89NH\n" +
"UxiGEXPnsSKEibMNuq1j7JgT0wKBgQC9Wk2BfME01u9KEggqiCyQv5RC01vUo1Zh\n" +
"p67qWLzT6HKr5SEe5BysTETx2VonUrDRcRo4MW88eLlNg8NjYKS/4HGZygKu/1Dr\n" +
"7BKw6R9uG6r1k1RsCNOOtmHRibaSbdmqAH7gm4FvGc/kFTDaCfkcTXOYvg9tv1dB\n" +
"buTdRiIhNwKBgFN9Qh0x1b5uGi3EldTBqgEasGV0S0trgLPWFxulm4BEyvjQU9Fw\n" +
"l9mpFDKNRBenkuGNbotyLIrhru71azU4ikCxGT3ZSTgYSf2KeTpmtx5fLrU+aNfW\n" +
"cEeFEY5PQam6YJ6cjzb8Vu2emy0JAfbKH7ZGw86mjWCvlQ74BDzKcvjZAoGAAOAd\n" +
"AZ9BCWyA+Leyn/e3NQgduF1fzFDhAlyTG3RDkzs85HyPtaPaWhWUMAYQO6RPOvip\n" +
"5V6dJAtu1+PnEFuPB3ATNmHPt11o015pC7ZYNdsc5DvFJSa5S6yeMSjQ1kZ5viZ4\n" +
"b7NoWsokwuoyKp/nLfFRuoAOdDRxQ9Uua7N6TusCgYB8/PP4daUR63Bqk38rgqea\n" +
"jxw3SBxMq+Vi00xy0QBcMY5wqz0KRsj0Nnw6kG35IP0fYypZJq3mBaXRjZmboxXW\n" +
"pc6kDqf62WJdg6JL9bXH+ttRrVE3eKqXbETfYrYpaqRHffJXYzv5wwt8rO7VT2uq\n" +
"6Ydm9qt58YwYamKcnY25Xg==\n" +
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
