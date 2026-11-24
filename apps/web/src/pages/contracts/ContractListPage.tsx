import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentsApi } from '../../api/documents.api';
import { analysisApi } from '../../api/analysis.api';
import { DocumentDto } from '@fairtune/shared';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Dialog } from '../../design-system/Dialog';
import { EmptyState } from '../../design-system/EmptyState';
import { Alert } from '../../design-system/Alert';
import {
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  Clock,
  Loader2,
  Trash2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

export const ContractListPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await documentsApi.list();
      setDocuments(docs);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setErrorMessage('Please select a PDF file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const title = uploadTitle.trim() || uploadFile.name.replace(/\.pdf$/i, '');
      const newDoc = await documentsApi.upload(uploadFile, title);
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadFile(null);
      await loadDocuments();

      // Trigger automatic analysis
      try {
        await analysisApi.triggerAnalysis(newDoc.id);
      } catch {
        // Analysis can also be triggered manually
      }
      navigate(`/contracts/${newDoc.id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTriggerAnalysis = async (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnalyzingDocId(docId);
    try {
      await analysisApi.triggerAnalysis(docId);
      await loadDocuments();
      navigate(`/contracts/${docId}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Analysis failed to start.');
    } finally {
      setAnalyzingDocId(null);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this contract and its analyses?')) return;
    try {
      await documentsApi.delete(docId);
      await loadDocuments();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete contract.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Contract Intelligence Vault
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload music recording, publishing, or producer agreements to extract clauses and
            evaluate risks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/contracts/chat">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<MessageSquare className="w-4 h-4 text-brand-gold" />}
            >
              Open Contract Assistant
            </Button>
          </Link>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Upload Contract
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Error">
          {errorMessage}
        </Alert>
      )}

      {/* Contract List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-brand-gold">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No contracts in vault"
          description="Upload your recording contract, publishing agreement, or producer agreement to extract clauses and flag predatory terms."
          actionLabel="Upload PDF contract"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              variant="interactive"
              className="flex flex-col justify-between"
              onClick={() => navigate(`/contracts/${doc.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-border-subtle">
                  <div className="truncate">
                    <h3 className="text-sm font-semibold text-slate-100 truncate">{doc.title}</h3>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {doc.originalFileName}
                    </p>
                  </div>
                  <Badge
                    variant={
                      doc.status === 'EXTRACTED'
                        ? 'success'
                        : doc.status === 'PROCESSING'
                          ? 'warning'
                          : 'default'
                    }
                    size="sm"
                  >
                    {doc.status}
                  </Badge>
                </div>

                <div className="py-4 space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>File Size:</span>
                    <span className="font-mono text-slate-200">
                      {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'PDF'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span className="font-mono text-slate-200">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-status-danger hover:text-red-400 p-1.5 h-auto"
                  onClick={(e) => handleDelete(doc.id, e)}
                  aria-label="Delete contract"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2">
                  {doc.status === 'UPLOADED' && (
                    <Button
                      size="sm"
                      variant="stellar"
                      isLoading={analyzingDocId === doc.id}
                      onClick={(e) => handleTriggerAnalysis(doc.id, e)}
                      leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    >
                      Run AI Analysis
                    </Button>
                  )}
                  <span className="text-xs text-brand-gold font-medium flex items-center gap-1 group-hover:underline">
                    View findings <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal Dialog */}
      <Dialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Music Contract"
        description="Select a contract PDF up to 10MB. FairTune will extract text and segment clauses."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUploadSubmit}
              isLoading={isUploading}
              disabled={!uploadFile}
            >
              Upload &amp; Analyze
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <Input
            label="Contract title (optional)"
            placeholder="e.g. 2026 Exclusive Recording Agreement"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Contract PDF file</label>
            <div className="border border-dashed border-border-subtle rounded-xl p-6 text-center bg-surface/50 hover:bg-surface-elevated transition-colors">
              <input
                type="file"
                accept=".pdf,application/pdf"
                id="contract-file-upload"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="contract-file-upload" className="cursor-pointer block space-y-2">
                <FileText className="w-8 h-8 text-brand-gold mx-auto" />
                <div className="text-xs font-medium text-slate-200">
                  {uploadFile ? (
                    <span className="text-brand-stellar font-mono">
                      {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  ) : (
                    <>Click to choose a PDF file or drag and drop</>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">PDF documents up to 10MB</div>
              </label>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
