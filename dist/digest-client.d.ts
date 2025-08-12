import { SrfRequest, SrfResponse } from './types';
export default class DigestClient {
    private res;
    private req;
    private agent;
    private nc;
    constructor(res: SrfResponse);
    authenticate(callback: (err: Error | null, req?: SrfRequest) => void): void;
    _updateNC(): string;
    _compileParams(params: Record<string, any>): string;
    _parseChallenge(digest: string): Record<string, any>;
}
