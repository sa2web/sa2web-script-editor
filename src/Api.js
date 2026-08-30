import { i18n } from "./i18n.renderer";
let t=(msg)=>i18n.t(msg);
export const API={
   getComment:()=>{
      return `
declare const api: {
   user: {
      /**
       * ${t('api.user.put')}
       * @param name ${t('api.user.put.name')}
       * @param value ${t('api.user.put.value')}
       * @param site ${t('api.user.put.site')}
       * @param account ${t('api.user.put.account')}
       * @param did ${t('api.user.put.did')}
       * @returns {Promise<{status:boolean}>}
       */
      put(name:string,value:string,site?:boolean,account?:boolean,did:boolean): Promise<{status:boolean}>;
      /**
       * ${t('api.user.get')}
       * @param name ${t('api.user.get.name')}
       * @param site ${t('api.user.get.site')}
       * @param account ${t('api.user.get.account')}
       * @param did ${t('api.user.get.did')}
       * @returns {Promise<{value:string,status:boolean}>}
       */
      get(name:string,site=false,account=false,did=false): Promise<{value:string,status:boolean}>;
      /**
       * ${t('api.user.incr')}
       * @param name ${t('api.user.incr.name')}
       * @param step ${t('api.user.incr.step')}
       * @param site ${t('api.user.incr.site')}
       * @param account ${t('api.user.incr.account')}
       * @param did ${t('api.user.incr.did')}
       * @returns {Promise<{status:boolean}>}
       */
      incr(name:string,step=1,site=false,account=false,did=false): Promise<{status:boolean}>;
      /**
       * ${t('api.user.decr')}
       * @param name ${t('api.user.decr.name')}
       * @param step ${t('api.user.decr.step')}
       * @param site ${t('api.user.decr.site')}
       * @param account ${t('api.user.decr.account')}
       * @param did ${t('api.user.decr.did')}
       * @returns {Promise<{status:boolean}>}
       */
      decr(name:string,step=1,site=false,account=false,did=false): Promise<{status:boolean}>;
      /**
       * ${t('api.user.remove')}
       * @param name ${t('api.user.remove.name')}
       * @param site ${t('api.user.remove.site')}
       * @param account ${t('api.user.remove.account')}
       * @param did ${t('api.user.remove.did')}
       * @returns {Promise<{status:boolean}>}
       */
      remove(name:string,site=false,account=false,did=false): Promise<{status:boolean}>;
      /**
       * ${t('api.user.startsWith')}
       * @param prefix ${t('api.user.startsWith.prefix')}
       * @param site ${t('api.user.startsWith.site')}
       * @param account ${t('api.user.startsWith.account')}
       * @param did ${t('api.user.startsWith.did')}
       * @returns {Promise<{name:string,value:string}>}
       */
      startsWith(prefix:string,site=false,account=false,did=false): Promise<Array<{name:string,value:string}>>;
      /**
       * ${t('api.user.countAll')}
       * @param name ${t('api.user.countAll.name')}
       * @param site ${t('api.user.countAll.site')}
       * @param account ${t('api.user.countAll.account')}
       * @returns {Promise<number>}
       */
      countAll(name:string,site=false,account=false):Promise<{value:number,status:boolean}>;
      /**
       * ${t('api.user.sumAll')}
       * @param name ${t('api.user.sumAll.name')}
       * @param site ${t('api.user.sumAll.site')}
       * @param account ${t('api.user.sumAll.account')}
       * @returns {Promise<number>}
       */
      sumAll(name:string,site=false,account=false):Promise<{value:number,status:boolean}>;
   };
   http: {
      /**
       * ${t('api.http.ajax')}
       * @param options ${t('api.http.ajax.options')}
       * @param options.url ${t('api.http.ajax.options.url')}
       * @param options.method ${t('api.http.ajax.options.method')}
       * @param options.data ${t('api.http.ajax.options.data')}
       * @param options.headers ${t('api.http.ajax.options.headers')}
       * @param options.timeout ${t('api.http.ajax.options.timeout')}
       * @param options.dataType ${t('api.http.ajax.options.dataType')}
       * @param options.contentType ${t('api.http.ajax.options.contentType')}
       * @param options.processData ${t('api.http.ajax.options.processData')}
       * @returns {Promise<{ok:boolean,status:number,statusText:string,data?:any,error?:string,timeout?:boolean}>} ${t('api.http.ajax.return')}
       */
      ajax(options:{url:string,method?:string,data?:any,headers?:Record<string,string>,timeout?:number,dataType?:'json'|'text'|'html'|'arrayBuffer',contentType?:string,processData?:boolean}):Promise<{ok:boolean,status:number,statusText:string,data?:any,error?:string,timeout?:boolean}>;
   };
   dom: {
     /**
      * ${t('api.dom.querySelector')}
      * @param doc ${t('api.dom.querySelector.doc')}
      * @param cssOrXPathSelector ${t('api.dom.querySelector.cssOrXPathSelector')}
      * @returns {HTMLElement}
      */
      querySelector(doc:typeof document,cssOrXPathSelector:string):HTMLElement;
      /**
      * ${t('api.dom.querySelectorAll')}
      * @param doc ${t('api.dom.querySelectorAll.doc')}
      * @param cssOrXPathSelector ${t('api.dom.querySelectorAll.cssOrXPathSelector')}
      * @returns {Array<HTMLElement>}
      */
      querySelectorAll(doc:typeof document,cssOrXPathSelector:string):Array<HTMLElement>;
      /**
      * ${t('api.dom.isVisible')}
      * @param ele ${t('api.dom.isVisible.ele')}
      * @returns {Promise<boolean>}
      */
      isVisible(ele:HTMLElement):Promise<boolean>;
      /**
      * ${t('api.dom.getVisibleRect')}
      * @param ele ${t('api.dom.getVisibleRect.ele')}
      * @returns {Promise<{left:number,top:number,width:number,height:number,right:number,bottom:number}>}
      */
      getVisibleRect(ele:HTMLElement):Promise<{left:number,top:number,width:number,height:number,right:number,bottom:number}>;
      /**
       * ${t('api.dom.createOverlayBy')}
       * @param cssOrXPathSelector ${t('api.dom.createOverlayBy.cssOrXPathSelector')}
       * @param bindWindowStr ${t('api.dom.createOverlayBy.bindWindowStr')}
       * @param createObserver ${t('api.dom.createOverlayBy.createObserver')}
       * @param delayTime  ${t('api.dom.createOverlayBy.delayTime')}
       * @param fn ${t('api.dom.createOverlayBy.fn')}
       * @returns {HTMLElement} ${t('api.dom.createOverlayBy.return')}
       */
      createOverlayBy(cssOrXPathSelector:string,bindWindowStr:string,createObserver=true,delayTime=500,fn=(rect:DOMRect)=>void ):HTMLElement;
      /**
       * ${t('api.dom.createOverlayByBorder')}
       * @param bindWindowStr ${t('api.dom.createOverlayByBorder.bindWindowStr')}
       * @param top  ${t('api.dom.createOverlayByBorder.top')}
       * @param right ${t('api.dom.createOverlayByBorder.right')}
       * @param bottom ${t('api.dom.createOverlayByBorder.bottom')}
       * @param left ${t('api.dom.createOverlayByBorder.left')}
       * @param createObserver ${t('api.dom.createOverlayByBorder.createObserver')}
       * @param delayTime  ${t('api.dom.createOverlayByBorder.delayTime')}
       * @returns {HTMLElement} ${t('api.dom.createOverlayByBorder.return')}
       */
      createOverlayByBorder(bindWindowStr:string,top:string|number,right:string|number,bottom:string|number,left:string|number,createObserver=true,delayTime=500):HTMLElement;
      /**
       * ${t('api.dom.addResizeListener')}
       * @param cssOrXPathSelector ${t('api.dom.addResizeListener.cssOrXPathSelector')}
       * @param bindWindowStr ${t('api.dom.addResizeListener.bindWindowStr')}
       * @param callback ${t('api.dom.addResizeListener.callback')}
       * @param createObserver ${t('api.dom.addResizeListener.createObserver')}
       * @param delayTime  ${t('api.dom.addResizeListener.delayTime')}
       * @returns {void}
       */
      addResizeListener(cssOrXPathSelector:string,bindWindowStr:string,callback:(rect:DOMRect)=>void,createObserver=true,delayTime=500):void;
      /**
       * ${t('api.dom.getConnectListeners')}
       * @returns {Array<{querySelector:string,callback:(isConnected:boolean)=>void}>}
       */
      getConnectListeners():Array<{querySelector:string,callback:(isConnected:boolean)=>void}>;
      /**
       * ${t('api.dom.addConnectListener')}
       * @param cssOrXPathSelector ${t('api.dom.addConnectListener.cssOrXPathSelector')}
       * @param callback ${t('api.dom.addConnectListener.callback')}
       * @returns {void}
       */
      addConnectListener(cssOrXPathSelector:string,callback:(isConnected:boolean)=>void):void;

      /**
       * ${t('api.dom.removeConnectListener')}
       * @param cssOrXPathSelectors ${t('api.dom.removeConnectListener.cssOrXPathSelectors')}
       * @returns {void} 
       */
      removeConnectListener(cssOrXPathSelectors:string[]):void;
   };
   /**
    * ${t('api.product')}
    */
   config:{};
   utils:{
       /**
        * ${t('api.utils.wait')}
        * @param fn ${t('api.utils.wait.fn')}
        * @param timeoutMs ${t('api.utils.wait.timeoutMs')}
        * @param intervalMs ${t('api.utils.wait.intervalMs')}
        * @returns Promise<void>
        */
       wait(fn:()=>boolean, timeoutMs:number, intervalMs:number = 100):Promise<void>;
       /**
        * ${t('api.utils.runScript')}
        * @param code ${t('api.utils.runScript.code')}
        * @param callback ${t('api.utils.runScript.callback')}
        * @returns Promise<any>
        */
       runScript:(code:string,callback?: (result: any, error: Error) => void):Promise<any>;
   };
   /**
    * ${t('api.header')}
    * @param headerName ${t('api.header.headerName')}
    * @param isRequestHeader ${t('api.header.isRequestHeader')}
    * @returns Promise<string|string[]> ${t('api.header.return')}
    */
   header(headerName:string,isRequestHeader:boolean):Promise<string|string[]>;
}
`
   }
}
