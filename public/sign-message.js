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
"MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDeGAZYuI6t0fuE\n" + 
"bBtoR7PPgoFwx+E4kedR9UxUr4KB42uBLLCYxPUoP+4IHl43QSBNMT+PLp5EHqve\n" + 
"DIz/PlGpbyCMcWbZ1BWgpflDpp6yPXzHQf1rC6coUCiO+GtwxSUnCMG5xjs/kO8K\n" + 
"fjB8OQqZfFt/EgfUUQqsYo2DK1KMLVpjfBn9NmEVkaLNhMzp1lD0w0oOwLKZoSZQ\n" + 
"zhIS3kV9HlwdsCe895LBHyRHLBy8/1Vn+did+4Z/mDXxodGEipIxytSYfcVkdROw\n" + 
"S9Ej1T+EmDWE3QfFRDHEW8bBkCt12c9esGShVpS3aA/LHMYYClhQcW3WFNEkxZMQ\n" + 
"620DJNcpAgMBAAECggEAH5xrytT5+eOZWQ/KFt2dyjtZESRh+htKQXAYnTUd7j7g\n" + 
"XlJuEFB4VHJE/wLThinO3y3TTh3kiO2UqNZAe1Pza5pVl6fMa9Sz/1mgUPC2Rcha\n" + 
"qkHKQCI4eJRwMWlKYZKt5xBoAnkklbebTnMHk6bKy23X2A5I7v9Z9Y9RdQoFhc3q\n" + 
"3fJctTglBjBJzt0hsI6M8KBSrs7mZ3ykybi3r3t3XfDfnWYc8eWg28UjULgVeIpX\n" + 
"RvcxrYlYcNVqCCNYnlN3ZfPVV0caIfA1QeYjVHRQAuBbp/fQzeKkIcRA1E5mgE14\n" + 
"ULRRjQOEQQwKxfBSBCG3+xIZklzC1xusvqSSAKtBwQKBgQDxASoR856s07DXqwpw\n" + 
"uWCmB7uh0E9bh/xKV/l6tPMR0C5ox19qgvwSXotOTnfWZKFi2yK9PAVhoiOay5qY\n" + 
"pjcAxwic2CXt1WKQK5K3fN9qbo6uAsc4udzbJnoAY2fJx9hErX1Ak/REMgAdpx+B\n" + 
"6QB5pthZvoXJItfoEjWjYeSpmwKBgQDr6aRKkuZ2Y4sq4i2AQnTbsIIT2WeJZBzW\n" + 
"hyt+/arnc6CJ/6dmEDJQe+GVQworit6ccvmPLWe1fcnvFdppkEXMcCiovH0gpE4I\n" + 
"8xDHP49ly2DzvUT932X3NZVMf/190Xb8eKWvpu7LWJvgFTG9scpOSLewSsK0CB3d\n" + 
"NZABsSJAiwKBgB6rW0M1kXfE6LhJV+bIcHgwe7w32iF3yK9dSq5G4LffmkhTNt1D\n" + 
"FfjwdyHb8nwiCjeeU2lpffXSwF0uk9nhLRa4PWxYRVti0Ewwf1dCWNwefaG/UMLz\n" + 
"RBvPZa8u90JCYE89FLdnHKqhAkrDvcq2cA0LInUpPbU+7eLmjlTgXE0JAoGAF03r\n" + 
"RtqgHY3Tz5asPAFUnecf0molijLzjlWn/FF+soJ/l2JD3Rc4gS7bp+0Jciezuey5\n" + 
"rmUj24/jhNS50LfJzVo/CfwkuDbC5qtsOuKSfdHLcAiAajvJTNRkPTxfhDBO+r3I\n" + 
"UEPDTx8fttEhKsYHYBha3PVlqncqzBFgempPIeUCgYA2WmBBtULhSZfIfVxyDPM+\n" + 
"5447KzAmzR+pN6p9kWDo1ZS89HfAXLaM/IYaHZjJF9EIz0goHb8aQGVYMPftoB6H\n" + 
"qPgOTdp7drPuIcex51JGHq8KppJExJz/ln1tDwQuGDnNs9ZX9a0GOr8TbxuFUatY\n" + 
"9yq0MnmJSZjKx2CEDl3fWg==\n" + 
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
