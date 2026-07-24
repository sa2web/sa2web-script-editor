import { ipcRenderer } from "electron";

export class UserDataService {
    async put(name, value, site = false, account = false, did = false) {
        return ipcRenderer.invoke('userData.put', name, value, site, account, did);
    }

    async get(name, site = false, account = false, did = false) {
        return ipcRenderer.invoke('userData.get', name, site, account, did);
    }

    async remove(name, site = false, account = false, did = false) {
        return ipcRenderer.invoke('userData.remove', name, site, account, did);
    }
    async incr(name, step = 1, site = false, account = false, did = false) {
        return ipcRenderer.invoke('userData.incr', name, step, site, account, did);
    }
    async decr(name, step = 1, site = false, account = false, did = false) {
        return ipcRenderer.invoke('userData.decr', name, step, site, account, did);
    }
    async startsWith(prefix, site = false, account = false, did = false) {
        return ipcRenderer.invoke('userData.startsWith', prefix, site, account, did);
    }

    async countAll(name, site = false, account = false) {
        return ipcRenderer.invoke('userData.countAll', name, site, account);
    }

    async sumAll(name, site = false, account = false) {
        return ipcRenderer.invoke('userData.sumAll', name, site, account);
    }
}