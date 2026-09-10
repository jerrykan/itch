import { actions } from "common/actions";
import { Dispatch } from "common/types";
import { ambientWind } from "common/util/navigation";

interface ModalLike {
  id: string;
}

export function closeModal(dispatch: Dispatch, modal: ModalLike) {
  dispatch(
    actions.closeModal({
      wind: ambientWind(),
      id: modal.id,
    })
  );
}

/** while unclosable, the header close button and Escape are disabled */
export function setModalUnclosable(
  dispatch: Dispatch,
  modal: ModalLike,
  unclosable: boolean
) {
  dispatch(
    actions.setModalUnclosable({
      wind: ambientWind(),
      id: modal.id,
      unclosable,
    })
  );
}
