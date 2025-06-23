var HttpRequestHeader = Java.type("org.parosproxy.paros.network.HttpRequestHeader");
var HttpHeader = Java.type("org.parosproxy.paros.network.HttpHeader");
var URI = Java.type("org.apache.commons.httpclient.URI");

function sendingRequest(msg, initiator, helper) {
    var url = msg.getRequestHeader().getURI().toString();
    // Replace includes() with indexOf()
    if (url.indexOf('http://localhost:3000') !== -1) {
        print('Processing request to: ' + url);
        
        // Skip if this is already the login request
        if (url.indexOf('/rest/user/login') !== -1) {
            return;
        }

        // Create login request
        var loginMsg = msg.cloneAll();
        var loginUri = new URI('http://localhost:3000/rest/user/login', false);
        var loginHeader = new HttpRequestHeader(HttpRequestHeader.POST, loginUri, HttpHeader.HTTP11);
        
        // Set JSON content type
        loginHeader.setHeader("Content-Type", "application/json");
        
        // Set request body
        var requestBody = JSON.stringify({
            email: "admin@juice-sh.op",
            password: "admin123"
        });
        loginMsg.getRequestBody().setBody(requestBody);
        
        // Set content length as string
        loginHeader.setHeader("Content-Length", loginMsg.getRequestBody().length().toString());
        loginMsg.setRequestHeader(loginHeader);

        try {
            // Send login request
            helper.getHttpSender().sendAndReceive(loginMsg, true);
            
            if (loginMsg.getResponseHeader().getStatusCode() === 200) {
                var response = JSON.parse(loginMsg.getResponseBody().toString());
                var token = response.authentication.token;
                org.zaproxy.zap.extension.script.ScriptVars.setGlobalVar("logintoken", token);
                
                // Add token to original request
                var header = msg.getRequestHeader();
                header.setHeader("Authorization", "Bearer " + token);
                msg.setRequestHeader(header);
            } else {
                print('Login failed with status: ' + loginMsg.getResponseHeader().getStatusCode());
            }
        } catch (err) {
            print('Error during authentication: ' + err.message);
        }
    }
}

function responseReceived(msg, initiator, helper) {
    // Debug response if needed
    var requestUrl = msg.getRequestHeader().getURI().toString();
    if (requestUrl.indexOf('http://localhost:3000') !== -1) {
        print('Response from ' + requestUrl + 
              ' - Status: ' + msg.getResponseHeader().getStatusCode());
    }
}
