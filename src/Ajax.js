/**
 */
export async function ajax(options) {
    const method = (
        options.method ||
        'GET'
    ).toUpperCase();

    const dataType = options.dataType ?? 'json';

    const contentType =
        options.contentType ??
        'application/x-www-form-urlencoded; charset=UTF-8';

    const processData =
        options.processData ?? true;

    const headers = {
        ...(options.headers ?? {})
    };

    let url = options.url;

    let body;

    const controller = new AbortController();

    let timeoutId;

    let timeoutTriggered = false;

    if (
        options.timeout !== undefined &&
        options.timeout > 0
    ) {
        timeoutId = setTimeout(() => {
            timeoutTriggered = true;
            controller.abort();
        }, options.timeout);
    }

    try {
        // ==========================
        // GET / HEAD
        // ==========================

        if (
            options.data != null &&
            (
                method === 'GET' ||
                method === 'HEAD'
            )
        ) {
            const query = serialize(
                options.data
            );

            if (query) {
                url +=
                    (url.includes('?') ? '&' : '?') +
                    query;
            }
        }

        // ==========================
        // POST / PUT / PATCH...
        // ==========================

        else if (options.data != null) {
            if (!processData) {
                body = options.data;
            }

            // JSON
            else if (
                contentType.includes(
                    'application/json'
                )
            ) {
                body = JSON.stringify(
                    options.data
                );

                if (
                    !hasHeader(
                        headers,
                        'content-type'
                    )
                ) {
                    headers['Content-Type'] =
                        contentType;
                }
            }

            // application/x-www-form-urlencoded
            else {
                body = serialize(
                    options.data
                );

                if (
                    !hasHeader(
                        headers,
                        'content-type'
                    )
                ) {
                    headers['Content-Type'] =
                        contentType;
                }
            }
        }



        const response = await fetch(
            url,
            {
                method,
                headers,
                body,
                signal: controller.signal
            }
        );

        let data;

        try {
            data = await parseResponse(
                response,
                dataType
            );
        } catch (error) {
            return {
                ok: false,

                status:
                    response.status,

                statusText:
                    response.statusText,

                error:
                    error instanceof Error
                        ? error.message
                        : String(error)
            };
        }

        // HTTP 200~299
        if (response.ok) {
            return {
                ok: true,

                status:
                    response.status,

                statusText:
                    response.statusText,

                data
            };
        }

        // HTTP 4xx / 5xx
        return {
            ok: false,

            status:
                response.status,

            statusText:
                response.statusText,

            data
        };

    } catch (error) {
        // ==========================
        // timeout
        // ==========================

        if (
            error instanceof Error &&
            error.name === 'AbortError'
        ) {
            return {
                ok: false,

                status: 0,

                statusText:
                    timeoutTriggered
                        ? 'timeout'
                        : 'abort',

                error:
                    timeoutTriggered
                        ? 'Request timeout'
                        : 'Request aborted',

                timeout:
                    timeoutTriggered
            };
        }

  

        return {
            ok: false,

            status: 0,

            statusText: 'error',

            error:
                error instanceof Error
                    ? error.message
                    : String(error)
        };

    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}



function serialize(data) {
    if (data == null) {
        return '';
    }

    if (typeof data === 'string') {
        return data;
    }

    const params = new URLSearchParams();

    for (
        const [key, value]
        of Object.entries(data)
    ) {
        if (value == null) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                params.append(
                    key,
                    serializeValue(item)
                );
            }
        } else {
            params.append(
                key,
                serializeValue(value)
            );
        }
    }

    return params.toString();
}


function serializeValue(value) {
    if (
        typeof value === 'object' &&
        value !== null
    ) {
        return JSON.stringify(value);
    }

    return String(value);
}



async function parseResponse(
    response,
    dataType
) {
    switch (dataType) {
        case 'json':
            return await response.json();

        case 'text':
        case 'html':
            return await response.text();

        case 'arrayBuffer':
            return await response.arrayBuffer();

        default:
            return await response.text();
    }
}


function hasHeader(
    headers,
    name
) {
    const target =
        name.toLowerCase();

    return Object.keys(headers).some(
        key =>
            key.toLowerCase() === target
    );
}


export default ajax;