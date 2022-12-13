<!-- List all products -->

<?php if(!empty($products)){ foreach($products as $row){ ?>
<div class="pro-box">
    <div class="info">
        <h4><?php echo $row['name']; ?></h4>
        <h5>Price: <?php echo '$'.$row['price'].' '.$row['currency']; ?></h5>
    </div>
    <div class="action">
        <a href="<?php echo base_url('products/purchase/'.$row['id']); ?>">Purchase</a>
    </div>
</div>
<?php } }else{ ?> 
    <p>Product(s) not found...</p>
<?php } ?>
