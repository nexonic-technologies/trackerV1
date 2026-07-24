import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import FloatingCard from "@components/Common/FloatingCard";
import FormRenderer from "@components/Common/FormRenderer";
import toast from "react-hot-toast";

const CRMQuotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Form Fields Definition
  const quotationFields = [
    {
      name: "clientId",
      label: "Client Account",
      type: "AutoComplete",
      source: "/populate/read/clients",
      required: true
    },
    {
      name: "contactId",
      label: "Linked Lead Contact",
      type: "AutoComplete",
      source: "/populate/read/contacts"
    },
    { name: "validUntil", label: "Validity Expiry Date", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
    { name: "termsAndConditions", label: "Terms & Conditions", type: "textarea" },
    {
      name: "status",
      label: "Workflow Status",
      type: "select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Sent", label: "Sent" },
        { value: "Under Review", label: "Under Review" },
        { value: "Revision Requested", label: "Revision Requested" },
        { value: "Internally Approved", label: "Internally Approved" },
        { value: "Client Approved", label: "Client Approved" },
        { value: "Client Rejected", label: "Client Rejected" }
      ],
      defaultValue: "Draft"
    }
  ];

  // For line item creation
  const [lineItems, setLineItems] = useState([]);
  const [currentLine, setCurrentLine] = useState({
    productId: "",
    projectTypeId: "",
    serviceProviderId: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRate: 18
  });

  const fetchQuotations = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/quotations", {
        limit: 1000,
        populateFields: ["clientId", "contactId"]
      });
      setQuotations(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching quotations:", err);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const addLineItem = () => {
    if (!currentLine.unitPrice) {
      toast.error("Unit price is required for line items");
      return;
    }
    setLineItems([...lineItems, currentLine]);
    setCurrentLine({
      productId: "",
      projectTypeId: "",
      serviceProviderId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 18
    });
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleQuotationSubmit = async (formData) => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const payload = {
      ...formData,
      lineItems
    };

    try {
      if (selectedQuotation) {
        await axiosInstance.put(`/populate/update/quotations/${selectedQuotation._id}`, payload);
        toast.success("Quotation updated successfully");
      } else {
        await axiosInstance.post("/populate/create/quotations", payload);
        toast.success("Quotation created successfully");
      }
      setFormOpen(false);
      setSelectedQuotation(null);
      setLineItems([]);
      fetchQuotations();
    } catch (err) {
      console.error("Error saving quotation:", err);
    }
  };

  const convertToOrder = async (quote) => {
    try {
      // Create order acknowledgement from client approved quotation
      const orderPayload = {
        quotationId: quote._id,
        clientId: quote.clientId?._id || quote.clientId,
        modules: quote.lineItems.map(item => ({
          projectTypeId: item.projectTypeId,
          serviceProviderId: item.serviceProviderId,
          agreedValue: item.lineTotal,
          description: item.description
        })),
        totalOrderValue: quote.grandTotal,
        status: "Pending Client Approval"
      };

      await axiosInstance.post("/populate/create/orderacknowledgements", orderPayload);
      toast.success("Order Acknowledgement created successfully!");
      fetchQuotations();
    } catch (err) {
      console.error("Error converting quotation to order:", err);
    }
  };

  const tableData = quotations.map(q => ({
    _id: q._id,
    number: q.quotationNumber,
    client: q.clientId?.name || "Unknown Client",
    contact: q.contactId ? `${q.contactId.firstName} ${q.contactId.lastName || ""}`.trim() : "None",
    total: `$${(q.grandTotal || 0).toLocaleString()}`,
    status: q.status,
    expiry: q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "30 days default",
    quoteData: q
  }));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-gray-800">Quotations Manager</h3>
        <button
          onClick={() => {
            setSelectedQuotation(null);
            setLineItems([]);
            setFormOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          New Quotation
        </button>
      </div>

      <TableGenerator
        data={tableData}
        hiddenColumns={["_id", "quoteData"]}
        customRender={{
          status: (row) => (
            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
              row.status === "Converted to Order"
                ? "bg-green-100 text-green-800"
                : row.status === "Client Approved"
                ? "bg-emerald-100 text-emerald-800"
                : row.status === "Internally Approved"
                ? "bg-blue-100 text-blue-800"
                : row.status === "Revision Requested"
                ? "bg-amber-100 text-amber-800"
                : row.status === "Client Rejected"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}>
              {row.status}
            </span>
          ),
          number: (row) => (
            <button
              onClick={() => {
                setSelectedQuotation(row.quoteData);
                setDetailOpen(true);
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              {row.number}
            </button>
          )
        }}
        onEdit={(row) => {
          setSelectedQuotation(row.quoteData);
          setLineItems(row.quoteData.lineItems || []);
          setFormOpen(true);
        }}
      />

      {formOpen && (
        <FloatingCard
          title={selectedQuotation ? `Edit Quotation: ${selectedQuotation.quotationNumber}` : "New Quotation"}
          onClose={() => {
            setFormOpen(false);
            setSelectedQuotation(null);
            setLineItems([]);
          }}
        >
          <div className="space-y-6">
            <FormRenderer
              fields={quotationFields}
              defaultValue={selectedQuotation}
              onSubmit={handleQuotationSubmit}
            />

            {/* Custom Line Items Section */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold mb-3 text-gray-700">Quotation Line Items</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border mb-4">
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={currentLine.unitPrice || ""}
                  onChange={(e) => setCurrentLine({ ...currentLine, unitPrice: Number(e.target.value) })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={currentLine.quantity || ""}
                  onChange={(e) => setCurrentLine({ ...currentLine, quantity: Number(e.target.value) })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Discount %"
                  value={currentLine.discount || ""}
                  onChange={(e) => setCurrentLine({ ...currentLine, discount: Number(e.target.value) })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Tax %"
                  value={currentLine.taxRate || ""}
                  onChange={(e) => setCurrentLine({ ...currentLine, taxRate: Number(e.target.value) })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Item/Service Description"
                  value={currentLine.description}
                  onChange={(e) => setCurrentLine({ ...currentLine, description: e.target.value })}
                  className="px-3 py-2 border rounded col-span-2"
                />
                <button
                  type="button"
                  onClick={addLineItem}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Add Item
                </button>
              </div>

              {lineItems.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border rounded bg-white">
                      <div>
                        <p className="font-semibold text-gray-800">{item.description || "Quoted Service"}</p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity} | Unit Price: ${item.unitPrice} | Disc: {item.discount}% | Tax: {item.taxRate}%
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900">${item.lineTotal || (item.quantity * item.unitPrice)}</span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No items added yet</p>
              )}
            </div>
          </div>
        </FloatingCard>
      )}

      {detailOpen && selectedQuotation && (
        <FloatingCard
          title={`Quotation Details: ${selectedQuotation.quotationNumber}`}
          onClose={() => {
            setDetailOpen(false);
            setSelectedQuotation(null);
          }}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-semibold text-gray-800">{selectedQuotation.clientId?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Workflow Status</p>
                <p className="font-semibold text-gray-800">{selectedQuotation.status}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-700 mb-2">Itemized Summary</h4>
              <div className="space-y-2">
                {selectedQuotation.lineItems?.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b text-sm">
                    <div>
                      <p className="font-semibold">{item.description || "Quoted Service"}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} x ${item.unitPrice}</p>
                    </div>
                    <span className="font-bold">${item.lineTotal?.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1 text-right text-sm">
                <p>Subtotal: <span className="font-semibold">${selectedQuotation.subtotal?.toLocaleString()}</span></p>
                <p>Tax: <span className="font-semibold">${selectedQuotation.totalTax?.toLocaleString()}</span></p>
                <p>Discount: <span className="font-semibold">-${selectedQuotation.totalDiscount?.toLocaleString()}</span></p>
                <p className="text-lg font-bold">Grand Total: <span className="text-indigo-600">${selectedQuotation.grandTotal?.toLocaleString()}</span></p>
              </div>
            </div>

            {selectedQuotation.status === "Client Approved" && (
              <div className="border-t pt-4 flex justify-end">
                <button
                  onClick={() => {
                    convertToOrder(selectedQuotation);
                    setDetailOpen(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
                >
                  Convert to Sales Order
                </button>
              </div>
            )}
          </div>
        </FloatingCard>
      )}
    </div>
  );
};

export default CRMQuotations;
