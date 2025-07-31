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
var privateKey = "-----BEGIN PRIVATE KEY-----"
"MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC0U8rTSAjRZK/o\n" +
"eZgkS0CLQQDUfUEO4+Dq00ziuG/bEPytJdATsC4BI5CjTfFlvRisFHu78jbgwsWg\n" +
"HBs3jBLnU7n40AL6sEbWbAhyEyD0w2KhLOfWd4Up9+2MF9AXUaWhlM7pGjtyxPMj\n" +
"wha9NL2faLRMkEJ27wnA9si6iS+nMMoR+glZUq9MjtJTd969cDpPwYqlh/bFX+jJ\n" +
"/9qWfP+qt9gv3Y7SjSbldz4WYuf2wRuXDF/elxv7puUKwu9FH8z9TS/mz06abE8A\n" +
"5bba5MM6ldtkb1G2ZwqjCY4A9k9bGcuA99XZjkXGTrteEhh1UoORuC8iDZ8UByAE\n" +
"JBh/K7QRAgMBAAECggEAFXvPo+MWwNqj7fiRmI5aGNUUXBx1lChwRw3IQNEcK29f\n" +
"SSIig3v3iSVzcY9DSZ2RG0w/7xT09oth59i9Yd1ncaWrGAJxPmxiriBWE8Alap++\n" +
"CAl9b/LSm7zI0WpTXXnZ17Guwn0AdOSTupCArMdEKaIb6+y6bGi/YtzL7pRSR/Lf\n" +
"8GFJvvQ1ee6lTP5Ek46Lk/sgr3jzdqyVQ3JeJ0e0hZQL5dD//QjePTFQ6aX1RhBC\n" +
"5doLM2hQ4dFmyEJPCjKhYP83KbBJT9LaqSSAm6Uozo8foDAyEt7LqHGAvmuh9pQj\n" +
"cMoieHvZUSVF6wt2HeDqpZiM23lTV2s5t6CNITLN2QKBgQDkKyWVU6BVTpzKqtUT\n" +
"6DnzrqksoGVlwo1Qr+Z7KZUS2t2ObR5Vuu2n2MwSs3qUv/u0bp87BbvgKQcWAheO\n" +
"zAvkaaRM3/1WlgppjYImgMijJrxdliH+oFPCUTjuEviFb7xnRegbRMoSwELhINJJ\n" +
"fQRh6F/M3wwywMFtg1QRKW8amQKBgQDKUr4Bj8lUYGkEF7entgPQ1NoACjRTuBP+\n" +
"qgHHZ+TlBQxLN1BMHKgQuNI7cwKn6UwiydH3tFv+HdZkcvNxJSgrKfInO1CDBiCC\n" +
"sOnKmijU/cYM9j0m2pY8B12oYQewtQdVByTq2Cq2Kk1X39E5OhV3P5+9LSSFGbdC\n" +
"nN6tG6oIOQKBgQDkDbwi5NL8cPaGGvmeTB6gUZMF58txSmO0ohvcPlOh5OBN2wLW\n" +
"7V9cxHQ0vO9offs2/NpqQ/DkvB05Ah5Ju+inBHAT5k1wnccKeUX89fuUFsNvRv/z\n" +
"YIxXTJd6XbvIo0XMczLrDnZrB3/RRNzqVupqcbhPLSEkGUU8EGeWP7OtAQKBgQCt\n" +
"Kjxt4b8TdKDtW89Yv7RsXIFpX1KCBR837BIxtX53deabye/z9OLzzPxC3aD8TfVY\n" +
"IRyQwdGqoacJukkaIg9LQk97vIygV/IjaX/wZBlmkv2bwnV8d8H2BufmYYXPfGGW\n" +
"KNM0HWgRGguwlmPgcxJESjRSGf0T3nq3jMQZrX/OIQKBgQCnAXuleezriXXvHc59\n" +
"UHFodLb77iFYYDUmk3xX8dliiDKq2DRVRlpfmScKmB/C6qX82OMmETQGaJTPEzxL\n" +
"dy9sExS2irZVajmeoiGWfVk9zFBuVdi/lAcTcMogz5z4O4S8YKVPpH4DVD/fHRz4\n" +
"2k/gAox3Zlj8YF94Rvl8vAoPUg==\n" +
"-----END PRIVATE KEY-----\n"


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
