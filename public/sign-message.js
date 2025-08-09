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
"MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQClY4u6jQoErfat\n" +
"4rzMauFMzEVVZCXyp9kWnqvSYLjKV2UsGvxxtUxlDZn0ZsVeQCVKaLIFXLQyHTcS\n" +
"xgrThwLlU5Z2gz7a1BQTtQ0TQXl4KX7rpihuQ4yWPt7suuQQ5fpPPZBJscIQYvwd\n" +
"JCeg2QEju3NIY5YSJo8EWtzz47oK/jfucyMCppOCfNXcyPgVVKWZhw1LhfL/xq+8\n" +
"303dxsFqh/sqytXpl6zuWA45nFjmYshWaGYhH53Q3lIyPU7CowGqD2FODymkJnOo\n" +
"xzX0dFo2lFgmCXhw+CMQWYvSCOEU3+H4RV0+nP/BOqtsvv7sRzrLQW3/mNoycHLY\n" +
"/8sc/OZ3AgMBAAECggEACSp29DCTRVj6hhD06Bp3bi7N93TCWn52d8DQcD22dJ+/\n" +
"dnKm/xzXd2McOqo2kdwi8F0dvuQwKBqQ0paaw2zE3xoMUp2JnCk451b733P3acV9\n" +
"0ZXyU4hb1wr0PWyTkix2/F8eJqZD/Ek4FrdcT7v5XNY9vQIWL0znVTCrGSjd/b11\n" +
"MtkW6PKOZbyFfRz7WFBkdQpaAZNQcOYBJelWO6wFLy73HiIjQ4VXr1YEEHQ+uQHq\n" +
"uXwfgbaPHtdk5zVKB5qfwNgjhvwU6dh/vCoZ92q54VHpsunFsXCjlYp4t6gM/1bU\n" +
"dRBmeESeWzvC+ABP4BTBffqSF+lfZfMgRGLqfCkAtQKBgQDbxUNOQKaHwZ2mXXIr\n" +
"LHy2fozmQ2+x90j3hjcOo7FUvhtP8DDEeoTBoymm5UNzLfDICx6PWzEU2J0QFjHu\n" +
"nePuwCGSdF9dPZox2loEKO6KXWDzECSYsJiZIjbYUKJBY5q/47Fz2KRKqnvuJA0I\n" +
"J3qt97IQZzdt3vhrR1ApJWnnkwKBgQDAp0Viw4SYb/fF+X5Zd6k0ZSTcrANnVfsr\n" +
"3gP9pY1+IQIcvsZqEL1g148/4ZLjNKB6gPeTWjlKBnOCuGcjUvZjWPAAhbAwMJQ7\n" +
"J4DviNO1y+8uT+yDkx6lsWUvEtlmXf8Kt7dVCNETtTaTp7odCyrQ87dQfdxzKlXO\n" +
"BMhD+4HMDQKBgASPg2YMUWhfzDW3mrbqpWvkFGhy3c6Doy//yQS0wOlRSJ/QDDMH\n" +
"l9ms2SBtgYjSWzzLfkbbTZlxJVFAJKke/avmsMupPpFgxeJi9ZtAfjLA3VIt85R3\n" +
"lbMX0quKgNN6jauNvhD5Xe9uukOm295fc1xI15kfizbseZtAT5mK/TehAoGAaJXm\n" +
"KxmtT/vo7Mbm+rblWpZWDp4rMtwQgN4EGJzZVVGiDezbVhVEWeBr2eghj8qwHBEL\n" +
"Viky1Kbv6lUlWJ3fOEu97uqknWSh9AMcEe2b0SOm8uNcqIkjqBvHrGh1MQdyP2VA\n" +
"157zsdk8iagSd1XqpojISaAqHzMqZa9e8NkGu7kCgYAOp6rmnxOD3MFwSnueg3v3\n" +
"JYxh5Fa6HvvhomPEoGN7kv2ntVyCyoydh+7R1F+NdZHxkyz9Tfh17jnQ33FTmBcK\n" +
"ub3Z7AoJF/r6KxMa5oo69nnUX3HOCqbyK+1USPTMuSrEjcYsHCDKjdvTmwZMp99Q\n" +
"wIkEOvzIHJIddG3N1ZmLtA==\n" +
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
