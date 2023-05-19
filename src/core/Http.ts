import { IncomingMessage, IncomingHttpHeaders, STATUS_CODES } from 'http';
import { URL } from 'url';
import fetch from 'cross-fetch';
import RoutePlanner from './RoutePlanner';
import BaseNode from '../base/Node';

export class HTTPError extends Error {
  public readonly statusMessage!: string;
  public method: string;
  public statusCode: number;
  public headers: IncomingHttpHeaders;
  public path: string;
  constructor(httpMessage: IncomingMessage, method: string, url: URL) {
    super(`${httpMessage.statusCode} ${STATUS_CODES[httpMessage.statusCode as number]}`)
    Object.defineProperty(this, 'statusMessage', { enumerable: true, get: function () { return STATUS_CODES[httpMessage.statusCode as number] } })
    this.statusCode = httpMessage.statusCode as number;
    this.headers = httpMessage.headers;
    this.name = this.constructor.name;
    this.path = url.toString();
    this.method = method;
  }
}

export enum LoadType {
  TRACK_LOADED = 'TRACK_LOADED',
  PLAYLIST_LOADED = 'PLAYLIST_LOADED',
  SEARCH_RESULT = 'SEARCH_RESULT',
  NO_MATCHES = 'NO_MATCHES',
  LOAD_FAILED = 'LOAD_FAILED'
}

export interface TrackResponse {
  loadType: LoadType,
  playlistInfo: PlaylistInfo,
  tracks: Track[]
}

export interface PlaylistInfo {
  name?: string,
  selectedTrack?: number
}

export interface TrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
}

export interface Track {
  track: string;
  info: TrackInfo;
}

export default class Http {
  public readonly node: BaseNode;
  public input: string;
  public base?: string;
  public routeplanner: RoutePlanner = new RoutePlanner(this);

  constructor(node: BaseNode, input: string, base?: string) {
    this.node = node;
    this.input = input;
    this.base = base;
  }

  public url() {
    return new URL(this.input, this.base);
  }

  public load(identifier: string): Promise<TrackResponse> {
    const url = this.url();
    url.pathname = '/loadtracks';
    url.searchParams.append('identifier', identifier);

    return this.do('GET', url);
  }

  public decode(track: string): Promise<TrackInfo>;
  public decode(tracks: string[]): Promise<Track[]>;
  public decode(tracks: string | string[]): Promise<TrackInfo | Track[]>;
  public decode(tracks: string | string[]): Promise<TrackInfo | Track[]> {
    const url = this.url();
    if (Array.isArray(tracks)) {
      url.pathname = '/decodetracks';
      return this.do('POST', url, Buffer.from(JSON.stringify(tracks)));
    } else {
      url.pathname = '/decodetrack';
      url.searchParams.append('track', tracks);
      return this.do('GET', url);
    }
  }

  public async do<T = any>(method: string, url: URL, data?: Buffer): Promise<T> {
    try {
      const res = await fetch(`${this.input}${url.pathname}${url.search}`, {
        method,
        headers: {
          Authorization: this.node.password,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })

      const message = await res.json();
      return message;
    } catch (error: any) {
      throw new HTTPError(error.message, method, url);

    }


  }
}
