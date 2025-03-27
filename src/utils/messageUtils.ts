import {
  MessageResponseType,
  MessageRequestType,
  ResponseMessage,
  RequestMessage,
  MESSAGE_RESPONSE_PAYLOADS,
  MESSAGE_REQUEST_PAYLOADS,
} from '../types/messages';

export const createResponseMessage = <T extends MessageResponseType>(
  type: T,
  payload: (typeof MESSAGE_RESPONSE_PAYLOADS)[T],
): ResponseMessage<T> =>
  ({
    type,
    payload,
  }) as ResponseMessage<T>;

export const createRequestMessage = <T extends MessageRequestType>(
  type: T,
  payload: (typeof MESSAGE_REQUEST_PAYLOADS)[T],
): RequestMessage<T> =>
  ({
    type,
    payload,
  }) as RequestMessage<T>;
