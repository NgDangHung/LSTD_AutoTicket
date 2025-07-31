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
var privateKey = "-----BEGIN PRIVATE KEY-----"+
"MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxGcO5RUHRSLj8\n" +
"30ysDqtl720sCWix+XCz3iUFLRTK0JQGWxhrdfd1IVNRfeccRucgZkPGVTTIUJZ6\n" +
"sJADBcGSRJFN62Gs/u6TwT+0lB9c/pW/pXzLFJ/UjcRAlw5jnv0M+gHHTTMqjDs5\n" +
"MmLGNBc7dBYpxgZ5dnbYHL9zeQ6gCpjYQGFm2NsHJ9GOlbIGYNLJDY5O/LWV+Ekd\n" +
"tq1JZmunksuJeDll2cX+Qb7roITrRlbSllVU2TQmLsy8/N6RVlpf61Oy8wyqk+Iw\n" +
"aflWtF/ik2k8fo/nU121+Xj8HSyjz8nj1I2GSAxsZvmy+XDTBbx0PHu0pDuZ4T9y\n" +
"gum8D/sNAgMBAAECggEAVymmEcZLWXSgTxybwMbLhrTrF1ReKdHprSz1LXH9nMBB\n" +
"SkuFXkZGD2jid+YuW9VtpZ2PV8rR2pEHLsU9a69mkNWcaiwh+6HQy/m9n+OS+BL4\n" +
"osURAWZaL6PCZkOyOkeipcNaIrwVJai08TaiNIiosoM08URcJWWvojer5mo7T3p2\n" +
"EETOC/99IQYd8nqG8UVesdNnf3/jBLmhudfvKGKCQ78iU7crT7Stc0n/861CoFBh\n" +
"1tS2UqQr7g5QnFEszp9KHb42rxMQTABxjMKSlovsDKQ59hBSPxjTajfRhxIGs2k6\n" +
"wEfUqFYwaWieVjseRi42nYkDI1Ei1CV9SHdG1I7TBQKBgQDZtk4SyTSS4E4OiZ/A\n" +
"Em48TDfFZWf+KFXZ8IJFNhemPflLeesciFUic1f7D106ZQbwMTFMgma9rYiowGv5\n" +
"aznKxEHMpKSVFcZk3xbqs2ATI4weE+LdnEZ3PH/oi/oU2NXSAFbr1UoVfW6Jcjqx\n" +
"0lozBpKsc+SkVDtPlsLIKPCIdwKBgQDQPxNQRKiVIltCEvswH4SVrzmKD+Fx58an\n" +
"b7u4Yoj3WTkRbniKXJwE7088DJqb3x+Uy/6qPKkoidqa6/jRZ2H2RxPeZceMGu2O\n" +
"vLtHpZJD5nK6iGUGj/LjMj+ix9+d0T89MDXyhJhWIU4cHdf1CJ5rQ0SkcoiSedyP\n" +
"7V2cIJ89mwKBgBvgxE6ThS/pmRUzeklWEteVyu5z9cUN1TB7I7NJIe4fsXSAwCJ/\n" +
"MqeerX1wkjeQCDtpkS6C5DUVq5IwUaM2n8ffKa3Sx2Bv0V/JUV3sajkJLEANu9c0\n" +
"07EhBh/5DKTuvzKM6JR6U2o9DZJ8Fhf/H525Eb8TeAuy3YVrgLWwyFwxAoGBAMK1\n" +
"xzwtBidzGTq9fqmvPouqa7VgRd335bGWckHjt8b2YLqgvQo5rxOaIk62RjVpuSCq\n" +
"YDISR+QEiSaDboF1FY5tRPGT3rFsWCQ26TEDabAdH7azYypwm5y81e1Azx/Dj0qJ\n" +
"8lcQjVMzDtKRQOP2LBGEswDDqliyonzcZsNdaSbzAoGBANff4Q4wXOvmYsorVd65\n" +
"NsESazu6GLx0iDrks2NLEEuZf/rOEN8t9x9WGpRwzzAvFNyQv2zXioCt9yAsuINX\n" +
"CETNtXPxX+ymjT5z+PLrMTi65tNPuRJAPVnLi8AZl3L/mNGtZMTnsLlpXCHOeWen\n" +
"wcWNMXw3mqtRVb4aZbK6benT\n" +
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
