import { Authorizer } from '@fresh-js/core';

export type ProjectAuthorizers = {
  minter?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;
};
