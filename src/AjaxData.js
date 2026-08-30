
import { ipcRenderer } from "electron";

export class AjaxDataService {
    async ajax(options){
        return ipcRenderer.invoke('ajaxData.ajax',options);
    }
}