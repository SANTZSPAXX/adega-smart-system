-- Add DELETE policy for sales
CREATE POLICY "Users can delete own sales"
ON public.sales
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for sale_items
CREATE POLICY "Users can delete own sale items"
ON public.sale_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM sales
  WHERE sales.id = sale_items.sale_id
  AND sales.user_id = auth.uid()
));

-- Add DELETE policy for stock_movements
CREATE POLICY "Users can delete own stock movements"
ON public.stock_movements
FOR DELETE
USING (auth.uid() = user_id);