import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import React, { useState } from "react";

export const useConfirm = (
  title: string,
  message: string
): [() => JSX.Element, (options?: { title?: string; message?: string }) => Promise<unknown>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);
  const [runtimeTitle, setRuntimeTitle] = useState<string | null>(null);
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);

  const Confirm = (options?: { title?: string; message?: string }) => {
    return new Promise((resolve) => {
      if (options?.title) setRuntimeTitle(options.title);
      if (options?.message) setRuntimeMessage(options.message);
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setPromise(null);
    setRuntimeTitle(null);
    setRuntimeMessage(null);
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const ConfirmDialog = () => {
    return (
      <Dialog
        open={promise !== null}
        onOpenChange={(open) => !open && handleCancel()}
      >
        <DialogClose onClick={handleCancel} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{runtimeTitle ?? title}</DialogTitle>
            <DialogDescription>{runtimeMessage ?? message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button onClick={handleCancel} variant={"outline"}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return [ConfirmDialog, Confirm];
};
