;;; export.el --- Description -*- lexical-binding: t; -*-

(require 'ox)
(require 'ox-html)

(setq org-html-htmlize-output-type nil)
(setq org-html-htmlize-font-prefix nil)

(defun bronen/export-org-content ()
  (let ((file (car command-line-args-left)))
    (with-current-buffer (find-file-noselect file)
      (let* ((info (org-export-get-environment 'html))
             (title (plist-get info :title))
             (description (plist-get info :description))
             (created-at (plist-get info :created-at))
             (archived (plist-member info :archived))
             (body (org-export-as 'html nil nil t))
             (data (make-hash-table :test 'equal))
             (content (make-hash-table :test 'equal)))

        (puthash "title" title data)
        (puthash "description" description data)
        (puthash "created_at" created-at data)
        (when archived
          (puthash "archived" t data))

        (puthash "data" data content)
        (puthash "body" body content)
        
        (print (json-encode content))))))

(bronen/export-org-content)

;;; export.el ends here
