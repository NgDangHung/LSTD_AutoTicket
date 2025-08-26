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
"MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDcOaMBVIp5iQDT\n" +
"Ni7A580OT5oMkDXeu5xz+XsZsW4++ToC7vOuKVoIhLW9001fX5EQjgx2GCsExRoR\n" +
"xYgPt2CWIpLyGoWquUb21kGr/mYF5KqqT6E9UBWclC85MrEjkAWZKHtZKt1RXwvq\n" +
"LYd33W6/9FWnLnz6bmRxD8Zj+Z4y5JzGbfjftFWBOFzPRX+hwEbDyIHhFpQ0RSxR\n" +
"MfvjGj6SV1lPXMEja0f4xQ3aYsH+8O/GrSbwQ3eGGLM37ALjaqNY0NJjfKGudXdB\n" +
"dJLmPX/CrVaef5uc7hbT9Cvaofr76cMiFW+tu2x+nQZHXaFuXH0R7+Ue4cruBP7t\n" +
"F1J3UBo5AgMBAAECggEAFd3pufY2ZTy1rqMyx4AEwALmq5BurunvTiMzplCUPy/B\n" +
"Qz0NiGmt+UpPHvUCGeIb/foy0c+Sxu+Yx/K2kMPvNN0kPOKmCtaIjbYm0XCKWhOz\n" +
"YAOV4agH61MZ8MqgJOU2LxfiTo9naB7hSJyCduQPbQMydY4TxgyLz9+mffMRUqFq\n" +
"Cn3vPtaTpm5fIl8P29G6payIBF0qdT2hTT7inmkfy9IlWoLysJXLYuAS9wGHdK6B\n" +
"Bg6ru9IB1ekXC81RnXueRsLQOm9tHwQ92q/6YnNFBnYrsH0C0fI1uoGlb2ygQ2rj\n" +
"IdNdcOVYBscqj95vJbd+hUjw8q61kY0zqsV2InL6QQKBgQD/PdYlAba/DdB4qxT2\n" +
"ZcdJaxnDSLSnebJBTXgVF5ihRa5YN8wWgmc15i8FSXVPzkGoaDtUb5EGrtFa0adc\n" +
"1CII8men/5II4ZIZkZR2fuQwPk6XYjcZodUpNPmgDEHfdMIE7KhI173CRZQXAACj\n" +
"fn8ZwS2kZCpMnWesuWVPFBSVQQKBgQDc4Sm/+tp7bcjF7HJr5rHhB8XdLmh93hRm\n" +
"I4o6EOg/ziPheKTxep2j53YPrvqErTUG0cbg7RQ73PEQihevs2znWpIjezRaKdvc\n" +
"reP0H1S6fPYpIKYa5uZopzhuIZY/KI5sXkVusyTlFdo6y56XOWP8OpPVFJo5dGsE\n" +
"LpYAf+lu+QKBgQCekcEXbpAk86UfQlIcnbCIeSQhQWsSXLWUgldm6yjkkFC297sw\n" +
"BMWwI5f0teVOtjnuMQsi8sjrmPHxdSx/rD6UxlwFb+4+3DyS6/GLCFwlaKAUxmyq\n" +
"3PJ7zjCC8Pp/o57hxlDqKDX4mpddDqBW8kBuNKhxZ9UrkeKV2PwKe9QpwQKBgD7P\n" +
"9Tx4DNue28KVO/C9WQZiXH1KrkJk/i4Rm0Rp/HHwoDmFQnq9YMj0kJljLDDAxNyc\n" +
"mU7rfJ6NdSw76QJ5JtYf5oEaj0e4saJu/O02X7Tsxl/pvfLWiN1n+F8xQ/XQBbiB\n" +
"koMphKt07Gtd7kqY8nsO+W1V/4mpNqmoydV4ipyZAoGAVgKaCATAQkrK/f9fRBu1\n" +
"jlJy0RDI5qkmAxclN/6Fn/H7B7Ws9jp9WYh8kkQzoGCBi8V6qVBNy/3URpu8NErI\n" +
"6PRmBBPQMbKYpzfiM6H17e1zCKY61ak4f0t3vCQZ9i8Yng6BFr/rWqQ0QpxWy4/S\n" +
"cSMEXiq8dD5uwyHq926Di30=\n" +
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
