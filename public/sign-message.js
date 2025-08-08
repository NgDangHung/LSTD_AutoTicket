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
"MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCri7PlaC4t504j\n" + 
"lWI5ZXwCfdxouSattcRNZ4aA7i+ItkB/TAL9oZcy19ym1YO+Od4eBG/9hPMAFJSG\n" + 
"eVtQxObWT4WwRpLF+Gyh4pq2A5ggkBSLGN43HaAN8/TUk8bUdMH7/tXibypBIJUG\n" + 
"BBq2Hb75E0GmV6XXoksTI+l1AvlH0EShMIxfFRn8NEp33r+LC/eloiksjSzQwG/h\n" + 
"JMC7wl1K8XotG+AP+n2w2llizKDshGfaXewo1OOlbiLlQgqIqiupGWn4fMRIjkpq\n" + 
"PbkyPo8YDhBZxM98kjVxMc0WuSofD40CqJPnV+Ctg7t4S1GsjIKZxtQ/qcji8YVI\n" + 
"2DzfhCr3AgMBAAECggEAH2O4z0l46b1hdvFmv8nqHyqYojD++to/yUogOoda+1Ee\n" + 
"DC0EfxSKbitBnOWE7dH46tU1CNbDAEjDxLeAFg9xjdWPSOohAUir2BN268dMlujG\n" + 
"WY17W+p31xXEvwEraMTUmh/PU1e0C6bCng8yNBDNWRZE9QMkvYhc5Gu11EtvAcy1\n" + 
"TcdK4Rw5oF5WsJcZcrU4gbNautmT58bUEq7YZPjHYGGgUik/1wZRXdGa0SDRmxKl\n" + 
"MFm1n8GQa/r2SgifCH5nyC/bsL+DeGSh18jV0fLFOfhEhxXyGTUaYqWm/cRAiM/t\n" + 
"alleWwkuoVSAuSThFN/MWEjfyuYMS4mRkURwbobGQQKBgQDjoEaDnUG9FRcuIQ1h\n" + 
"iF0ZU021i8Yvjs2bprz6CoJeYvNRXZCPsy0Fik+IPVP232Xw/3IJopc1t8JOHpbJ\n" + 
"lcG6DigUQsC6I++sURF4m7zcjOKHzILtIhvVRqYmlx94Hfmw2mJeonkrPR4SaV6g\n" + 
"pu2CiYEPtgkUxUlI2ei4ENygDQKBgQDA7dwEIzCM9v8+hKJb7CsgxztsUqN+Vrm0\n" + 
"xbMyCCb4DNwoutiigIj6Xic9BXUwtsi6FCgK99PKrATuHZ6X2jMRqBm6HavlbV6y\n" + 
"qyIOfWOoXcvB8qXvsTxng9zoLQtM9v/d/MBNFZLYvKtLhVOf6A6qKMDmGdAG6Ro1\n" + 
"XuzAATjyEwKBgBp0qV1orJhOWDhbTRPV5oQoA3MjQLCMV2dM1M/24roXpBID3uZk\n" + 
"u8nWDnJWNmkOA+ojtlxaUlrC9clgksPxLOfz90KLk5zOym9rqK0s5KF5mmaQJXNs\n" + 
"MHH0WSFJFTY/vaKJbz9ygMS+wL0BFCd130r5sk9iJ+ILH/5gnUSvaQUNAoGAdZjG\n" + 
"sjLs5g+sF2RrPpKe2zT1kJpyk5CzU2/qQUXc0vervpvdbnfghpObYUORYicYBOxC\n" + 
"WCUlkHT38FhXkgHrfQi03dA2NftLbKaJdMGTXE4H4+lOoeKrigFDRrYmHDy2S45D\n" + 
"fPj4cGnYE4lqJp8hSTDcG6WCOqQdWIjK0GIuXscCgYEAzNWLRbr92xWT5ySymAwg\n" + 
"Z5+H6aPB0YV6GapYLe6uOufzIwaCYKGhqYVxGkm9grTnuuxiVxDlPnDXazLnjTPE\n" + 
"JYoEF/Xp55/0Vz0wlr6227GbrAS6xFlsju1zLC3CsMprkFOPzUEamJdBiw4+0o0e\n" + 
"TAseV8VArExlGWruGtuFai4=\n" + 
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
