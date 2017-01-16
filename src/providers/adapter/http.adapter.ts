import { Inject, Injectable, OpaqueToken, Optional } from '@angular/core';
import { Http, URLSearchParams } from '@angular/http';
import { Config } from '@mbamobi/configuration';
import { Resolve } from '@mbamobi/url-resolver';
import { Result, ResultCode } from '../result';
import { AdapterOptions } from './adapter.options';

export const ConfigKeyAuth = 'authentication';

export const ConfigKeyAdapter = 'http';

export const HttpAdapterOptionsToken = new OpaqueToken('HTTPADAPTEROPTIONS');

export interface HttpAdapterOptions {
  [propName: string]: any;
  url: string;
  paramNameIdentity?: string;
  paramNameCredential?: string;
  method?: string;
  params?: Object;
  headers?: any;
  callbackResolve?: Function;
  callbackReject?: Function;
  callbackBuildParams?: Function;
}

@Injectable()
export class HttpAdapter extends AdapterOptions {

   protected url: string;

   protected params: Object = {};

   protected paramNameIdentity: string = 'username';

   protected paramNameCredential: string = 'password';

   protected callbackResolve: Function;

   protected callbackReject: Function;

   protected callbackBuildParams: Function;

   protected requestOptions: any = {
     method: 'POST'
   };

   constructor(
     protected http: Http,
     @Optional() protected resolve: Resolve,
     @Optional() config: Config,
     @Optional() @Inject(HttpAdapterOptionsToken) options: any
   ) {
     super();

     if (options) {
       this.setOptions(options);
     }

     if (config) {
       // @todo adjust config to accept key authentication.http
       options = config.get(ConfigKeyAuth);

       if (options) {
         options = options[ConfigKeyAdapter] || {};
         if (options) {
           this.setOptions(options);
         }
       }
     }
   }

   setUrl(url: string): this {
     this.url = url;
     return this;
   }

   setMethod(method: string): this {
     this.requestOptions.method = method;
     return this;
   }

   setParams(params: Object): this {
     this.params = params;
     return this;
   }

   setHeaders(headers: Object): this {
     this.requestOptions.headers = headers;
     return this;
   }

   setRequestOptions(options: any): this {
     this.requestOptions = options;
     return this;
   }

   setParamNameIdentity(name: string): this {
     this.paramNameIdentity = name;
     return this;
   }

   setParamNameCredential(name: string): this {
     this.paramNameCredential = name;
     return this;
   }

   setCallbackResolve(callback: Function): this {
     this.callbackResolve = callback;
     return this;
   }

   setCallbackReject(callback: Function): this {
     this.callbackReject = callback;
     return this;
   }

   setCallbackBuildParams(callback: Function): this {
     this.callbackBuildParams = callback;
     return this;
   }

   setOptions(options: HttpAdapterOptions): this {

     this.setUrl(options.url);
     delete options.url;

     if (options.paramNameIdentity) {
       this.setParamNameIdentity(options.paramNameIdentity);
       delete options.paramNameIdentity;
     }

     if (options.paramNameCredential) {
       this.setParamNameCredential(options.paramNameCredential);
       delete options.paramNameCredential;
     }

     if (options.method) {
       this.setMethod(options.method);
       delete options.method;
     }

     if (options.params) {
       this.setParams(options.params);
       delete options.params;
     }

     if (options.headers) {
       this.setHeaders(options.headers);
       delete options.headers;
     } else if (this.resolve) {
       const headers = this.resolve.getMetadata().getHeaders(this.url);
       if (headers) {
         this.setHeaders(headers);
       }
     }

     if (options.callbackResolve) {
       this.setCallbackResolve(options.callbackResolve);
       delete options.callbackResolve;
     }

     if (options.callbackReject) {
       this.setCallbackReject(options.callbackReject);
       delete options.callbackReject;
     }

     if (options.callbackBuildParams) {
       this.setCallbackBuildParams(options.callbackBuildParams);
       delete options.callbackBuildParams;
     }

     this.setRequestOptions(Object.assign({}, this.requestOptions, options));

     return this;
   }

   authenticate(): Promise<Result> {

     const params = this.bindParams();
     let url = this.url;

     if (this.resolve) {
       url = this.resolve.url(this.url, params);
     }

     let options: any = this.requestOptions;

     let callbackBuildParams = this.callbackBuildParams || this.buildParams;

     if (params) {
       let buildParams = callbackBuildParams.apply(this, [ params ]);
       if (options.method.toUpperCase() === 'POST') {
         options.body = buildParams;
       } else if (options.method.toUpperCase() === 'GET') {
         options.search = buildParams;
       }
     }

     return new Promise((resolve: any, reject: any) => {
       this.http.request(url, options).subscribe((response) => {
         if (typeof this.callbackResolve === 'function') {
           resolve(this.callbackResolve.apply(this, [ response ]));
           return;
         }
         resolve(this.createResultSuccess(response));
       }, (err: any) => {
         if (typeof this.callbackReject === 'function') {
           reject(this.callbackReject.apply(this, [ err ]));
           return;
         }
         reject(this.createResultFailure(err));
       });
     });
   }

   protected bindParams(): Object {
     let params = this.params;

     params[this.paramNameIdentity] = this.getIdentity();
     params[this.paramNameCredential] = this.getCredential();

     return params;
   }

   protected buildParams(params: any) {
     let searchParams = new URLSearchParams('');

     for (let param in params) {
       searchParams.set(param, params[param]);
     }

     return searchParams;
   }

   protected createResultSuccess(response: any): Result {
     return new Result(ResultCode.SUCCESS, this.getIdentity(), response.json() || response.body());
   }

   protected createResultFailure(err: any): Result {
     return new Result(ResultCode.FAILURE, null, err);
   }
}
