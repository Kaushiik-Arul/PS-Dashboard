"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfCookieName = void 0;
exports.getSessionCookieName = getSessionCookieName;
exports.readCookie = readCookie;
exports.setAuthCookies = setAuthCookies;
exports.clearAuthCookies = clearAuthCookies;
const developmentSessionCookie = 'ps_session';
const productionSessionCookie = '__Host-ps_session';
exports.csrfCookieName = 'ps_csrf';
function getSessionCookieName(isProduction) {
    return isProduction ? productionSessionCookie : developmentSessionCookie;
}
function readCookie(request, name) {
    const header = request.headers.cookie;
    if (!header)
        return null;
    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator === -1)
            continue;
        const key = part.slice(0, separator).trim();
        if (key === name)
            return decodeURIComponent(part.slice(separator + 1));
    }
    return null;
}
function cookieOptions(isProduction, maxAge) {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
        ...(maxAge === undefined ? {} : { maxAge }),
    };
}
function setAuthCookies(response, isProduction, sessionToken, csrfToken, maxAge) {
    response.cookie(getSessionCookieName(isProduction), sessionToken, cookieOptions(isProduction, maxAge));
    response.cookie(exports.csrfCookieName, csrfToken, {
        ...cookieOptions(isProduction, maxAge),
        httpOnly: false,
    });
}
function clearAuthCookies(response, isProduction) {
    response.clearCookie(getSessionCookieName(isProduction), cookieOptions(isProduction));
    response.clearCookie(exports.csrfCookieName, {
        ...cookieOptions(isProduction),
        httpOnly: false,
    });
}
//# sourceMappingURL=auth.cookies.js.map