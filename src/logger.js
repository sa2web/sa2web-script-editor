
export class Logger {
    constructor(clzName) {
        this.clzName = clzName;
    }
    info(...args) {
        if (process.env.NODE_ENV == 'development') {
            if (args.length > 0) {
                args[0] = `${this.clzName} % ` + args[0]
            }
            console.info(...args)
        }
    }
    warn(...args) {
        if (process.env.NODE_ENV == 'development') {
            if (args.length > 0) {
                args[0] = `${this.clzName} % ` + args[0]
            }
            console.warn(...args)
        }
    }
    error(...args) {
        if (process.env.NODE_ENV == 'development') {
            if (args.length > 0) {
                args[0] = `${this.clzName} % ` + args[0]
            }
            console.error(...args)
        }
    }
}