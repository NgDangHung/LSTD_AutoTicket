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
"MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDFJrz71Nj2KVmR\n" +
"8LBj7ovgC049m8Bya5AerOA/98zizcVTnGQKZczw8ccTzELupxjEmxaM/jTPVgDE\n" +
"zLhjJFSIYzEgDXLyQD/8SABAjbGI2wRajYyD9TnT8UBOVmLepEV7d8LRh6IfUiQa\n" +
"vFE6VpXI1+slN5TjCOOoK62/KY+ReLmngIRncuvD3NRwBhjtwDv+hknY+TtPNxM2\n" +
"/cSDhfwBNZaf0UQKnpvK/xRL4OoKYUH/6Wjxt24+2isCGBxWS5Thi6dayPT36jFq\n" +
"q4gPmY4GNO00g0A4hZMSWA8sK+3q0o72/pg8BuJoL4vYMW9q0eYJW1eyNtxAj9Gj\n" +
"WLKqs9W/AgMBAAECggEATH5fTQakt74LdsiAaAWiV+eLD/RikwKRBJXm3Gr1H/re\n" +
"2TYQysf84G+u4kuanKZQwde6xDHNo7Smz7TuxejOs6xo3xrYwo2TRftZvbI8c/Em\n" +
"m0vYfUqkiUtNvBdgfSoXm3Q4LrwFd0mToJv4mD4IF8lO/z21kvFcA2APJeCmR7Z0\n" +
"1qyA+S/2PvEPokkTFzeQpRJQvoXwOQb21sV+B/xanJBhu6ldkFaGTH4QVJDIaerw\n" +
"kmi9Oz7svfIAYgO080jOdbr1E1ZS7EvpoksVY28lIif7TCs3JslWbH9zR6H93dbD\n" +
"k5doSQ8WEyujKo0Dlahdw8lrrd1IEFWpsWjSWHjMwQKBgQDywf9388RL8S/2qiQJ\n" +
"tSVllBU+LKx5m0iBMQpdqBZRyxn0gCSfxPTxg5DSho3tUWbaFC/YpoD4tErJfipm\n" +
"m/7PauuEHZ8sNYXHSlNdKf61o1gFHxasFY/NWQePv00NY2Bjj4Qe2OVT+ovBvP1b\n" +
"LHNjOOhNczCwAXU1m2E8QALH6QKBgQDP593V6JQC2/wXxOjPoYXwQ1ltw4JJ8te9\n" +
"A8XZAmTi8X89U3iuKVoGEMemOCokmn/1VmNts5esI65yRIqx6YUDAvRGXzz4dB40\n" +
"Ge8lJzNDfie287uOW5NWwo7MboyW1e1NfVsGKx783iN2w7GUuFlnBqlpIX8BYeFd\n" +
"VtTVFHDPZwKBgQCkranKC5l8Eu+Am0a7NyFZWS1X8iJGlGqJCWWIxz/s2KSQ0mUF\n" +
"5Sxssd2KkzCwbuogwlT62WjgTh31thq5ZNVki5mdFCMocF6CJQ+MQbLCMT7CqqZM\n" +
"sovMt7qDbzir/mAi6fasnmJjp7ErCjOsp+jWxIICGERNAZArf25k2t+IEQKBgF0u\n" +
"YcmmtPfXGtSYZ3Pvw/Ucam98qd903OaVU05g+VCRxmJ5D+SXGgcP7Dt+frzrFiCi\n" +
"eGvJi1gWofAK8lKtA/WGlG8Z7ly4xnS5juqK+Dnux+QCt3QlbRL8nj3X6mEMPpB1\n" +
"d597IidZdHGdYfDy8vbvEGzTG3ZGJVjNOxTJVYpPAoGAT1xEmvAetbT9TL42653/\n" +
"7VMdheQc7HwMBS1Wq2XKpUHxmBzl0Rlgmvw7Yrb/lgowV04a8fUICmvJ5zOW/yiK\n" +
"ICWCIDqwo/rjUsblnwmpbRPnu9FxwZjpwEecYFm6kjH/VLWOhigjepj0UTpA5ARt\n" +
"kYm5lGCilf7Y4CRci2qtCpc=\n" +
"-----END PRIVATE KEY-----";

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
